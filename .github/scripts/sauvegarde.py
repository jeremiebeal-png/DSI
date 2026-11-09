#!/usr/bin/env python3
"""Sauvegarde nocturne vers SharePoint DSI-Backups.

1. Dépôt GitHub : DSI-AAAA-MM-JJ.bundle (historique complet) + DSI-AAAA-MM-JJ.zip (version actuelle)
   → Documents/GitHub/
2. Code des Workers Cloudflare (script + réglages + crons, sans les valeurs des secrets)
   → Documents/Workers/Workers-AAAA-MM-JJ.zip
3. Rétention : supprime dans ces deux dossiers les fichiers de plus de RETENTION_JOURS jours.

Variables d'environnement (secrets GitHub) :
  AZ_TENANT_ID, AZ_CLIENT_ID, AZ_CLIENT_SECRET  application Entra (Graph, Sites.ReadWrite.All ou Sites.Selected)
  SP_SITE   ex. "dsihotel.sharepoint.com:/sites/DSI-Backups"  (ou directement l'ID du site)
  CF_API_TOKEN     jeton Cloudflare « Workers Scripts : Read » (facultatif : sans lui, pas de sauvegarde des Workers)
  CF_ACCOUNT_IDS   ID(s) de compte Cloudflare, séparés par des virgules
Uniquement la bibliothèque standard Python.
"""
import datetime as dt
import email
import email.policy
import io
import json
import os
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import zipfile

RETENTION_JOURS = 30
CHUNK = 320 * 1024 * 32  # 10 Mio, multiple de 320 Kio exigé par Graph
AUJ = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d")
GRAPH = "https://graph.microsoft.com/v1.0"
erreurs = []


def http(method, url, data=None, headers=None, raw=False):
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            body = r.read()
            return body if raw else (json.loads(body) if body else {})
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{method} {url.split('?')[0]} → HTTP {e.code} : {e.read()[:400]!r}") from None


# ---------------------------------------------------------------- Graph / SharePoint
def jeton_graph():
    d = urllib.parse.urlencode({
        "client_id": os.environ["AZ_CLIENT_ID"],
        "client_secret": os.environ["AZ_CLIENT_SECRET"],
        "scope": "https://graph.microsoft.com/.default",
        "grant_type": "client_credentials",
    }).encode()
    url = f"https://login.microsoftonline.com/{os.environ['AZ_TENANT_ID']}/oauth2/v2.0/token"
    return http("POST", url, d, {"Content-Type": "application/x-www-form-urlencoded"})["access_token"]


def site_id(h):
    s = os.environ["SP_SITE"].strip()
    if ":" not in s:
        return s
    host, chemin = s.split(":", 1)
    return http("GET", f"{GRAPH}/sites/{host}:{chemin}", headers=h)["id"]


def envoyer(h, sid, dossier, nom, contenu):
    chemin = urllib.parse.quote(f"{dossier}/{nom}")
    sess = http("POST", f"{GRAPH}/sites/{sid}/drive/root:/{chemin}:/createUploadSession",
                json.dumps({"item": {"@microsoft.graph.conflictBehavior": "replace"}}).encode(),
                {**h, "Content-Type": "application/json"})
    url, total = sess["uploadUrl"], len(contenu)
    for debut in range(0, total, CHUNK):
        morceau = contenu[debut:debut + CHUNK]
        fin = debut + len(morceau) - 1
        http("PUT", url, morceau, {"Content-Length": str(len(morceau)),
                                   "Content-Range": f"bytes {debut}-{fin}/{total}"})
    print(f"  ✔ {dossier}/{nom} ({total / 1024:.0f} Ko)")


def purger(h, sid, dossier):
    limite = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=RETENTION_JOURS)
    url = f"{GRAPH}/sites/{sid}/drive/root:/{urllib.parse.quote(dossier)}:/children?$select=id,name,createdDateTime,file"
    while url:
        r = http("GET", url, headers=h)
        for it in r.get("value", []):
            if "file" not in it:
                continue
            cree = dt.datetime.fromisoformat(it["createdDateTime"].replace("Z", "+00:00"))
            if cree < limite:
                http("DELETE", f"{GRAPH}/sites/{sid}/drive/items/{it['id']}", headers=h)
                print(f"  🗑 {dossier}/{it['name']} (plus de {RETENTION_JOURS} jours)")
        url = r.get("@odata.nextLink")


# ---------------------------------------------------------------- Dépôt GitHub
def sauvegarde_depot():
    subprocess.run(["git", "bundle", "create", "/tmp/depot.bundle", "--all"], check=True)
    subprocess.run(["git", "archive", "--format=zip", "-o", "/tmp/depot.zip", "HEAD"], check=True)
    subprocess.run(["git", "bundle", "verify", "/tmp/depot.bundle"], check=True, capture_output=True)
    return [(f"DSI-{AUJ}.bundle", open("/tmp/depot.bundle", "rb").read()),
            (f"DSI-{AUJ}.zip", open("/tmp/depot.zip", "rb").read())]


# ---------------------------------------------------------------- Workers Cloudflare
def sauvegarde_workers():
    tok = os.environ.get("CF_API_TOKEN", "").strip()
    comptes = [a.strip() for a in os.environ.get("CF_ACCOUNT_IDS", "").split(",") if a.strip()]
    if not tok or not comptes:
        print("  (CF_API_TOKEN / CF_ACCOUNT_IDS absents : Workers ignorés)")
        return None
    h = {"Authorization": f"Bearer {tok}"}
    buf, n = io.BytesIO(), 0
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for acc in comptes:
            base = f"https://api.cloudflare.com/client/v4/accounts/{acc}/workers/scripts"
            for s in http("GET", base, headers=h)["result"]:
                nom = s["id"]
                rep = f"{acc}/{nom}"
                try:
                    # Script complet (multipart : un fichier par module)
                    req = urllib.request.Request(f"{base}/{nom}", headers=h)
                    with urllib.request.urlopen(req, timeout=120) as r:
                        corps, ctype = r.read(), r.headers.get("Content-Type", "")
                    if ctype.startswith("multipart/"):
                        msg = email.message_from_bytes(
                            f"Content-Type: {ctype}\r\n\r\n".encode() + corps, policy=email.policy.default)
                        for part in msg.iter_parts():
                            fichier = part.get_filename() or part.get_param("name", header="content-disposition") or "script.js"
                            z.writestr(f"{rep}/{fichier}", part.get_payload(decode=True) or b"")
                    else:
                        z.writestr(f"{rep}/script.js", corps)
                    z.writestr(f"{rep}/reglages.json",
                               json.dumps(http("GET", f"{base}/{nom}/settings", headers=h).get("result"), indent=2, ensure_ascii=False))
                    z.writestr(f"{rep}/crons.json",
                               json.dumps(http("GET", f"{base}/{nom}/schedules", headers=h).get("result"), indent=2, ensure_ascii=False))
                    z.writestr(f"{rep}/infos.json", json.dumps(s, indent=2, ensure_ascii=False))
                    n += 1
                    print(f"  ✔ Worker {nom}")
                except Exception as e:
                    erreurs.append(f"Worker {nom} : {e}")
                    print(f"  ✘ Worker {nom} : {e}")
        z.writestr("LISEZMOI.txt",
                   "Code des Workers Cloudflare au " + AUJ + ".\n"
                   "Chaque dossier : fichiers du script, reglages.json (bindings, variables — les valeurs des\n"
                   "secrets ne sont PAS exportées par Cloudflare), crons.json, infos.json.\n"
                   "Restauration : recopier le script dans l'éditeur Cloudflare et recréer bindings/secrets/crons.\n")
    print(f"  {n} Workers sauvegardés")
    return (f"Workers-{AUJ}.zip", buf.getvalue())


def main():
    h = {"Authorization": f"Bearer {jeton_graph()}"}
    sid = site_id(h)
    print("Dépôt GitHub")
    for nom, data in sauvegarde_depot():
        envoyer(h, sid, "GitHub", nom, data)
    print("Workers Cloudflare")
    w = sauvegarde_workers()
    if w:
        envoyer(h, sid, "Workers", *w)
    print("Rétention")
    for d in ("GitHub", "Workers"):
        try:
            purger(h, sid, d)
        except Exception as e:
            erreurs.append(f"Purge {d} : {e}")
    if erreurs:
        print("\nERREURS :\n- " + "\n- ".join(erreurs))
        sys.exit(1)
    print("\nSauvegarde terminée.")


if __name__ == "__main__":
    main()
