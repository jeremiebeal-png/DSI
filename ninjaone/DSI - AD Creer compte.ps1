<#
  DSI - AD Creer compte
  ---------------------------------------------------------------------------
  Script NinjaOne lancé par le Worker dsi-hotel-agent UNIQUEMENT après le « Oui » d'un technicien
  DSI Hotel (session MFA) dans le portail, sur un ticket « Arrivée collaborateur » validé par le RH.

  Crée UN compte utilisateur avec les valeurs validées, puis l'ajoute aux groupes choisis.
  Garde-fous dans le script lui-même (en plus de ceux du Worker) :
    - identifiant, UPN et OU contrôlés ; jamais d'écrasement d'un compte existant ;
    - aucun ajout à un groupe protégé (adminCount = 1 : Admins du domaine, Opérateurs…) ni intégré (RID < 1000) ;
    - le mot de passe provisoire n'est PAS un paramètre (il apparaîtrait dans l'historique NinjaOne) :
      il est lu une seule fois auprès du Worker avec le jeton de la tâche, puis effacé de la mémoire ;
    - « changer le mot de passe à la prochaine ouverture de session » est toujours coché.

  NinjaOne : Windows PowerShell, exécuter en tant que System.
  Paramètres (envoyés par le Worker) : -Callback <url> -Token <jeton> -ParamsB64 <json base64>
#>
param(
  [string]$Callback,
  [string]$Token,
  [string]$ParamsB64
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

if ($Callback -notmatch '^https://[A-Za-z0-9.-]+\.workers\.dev/callback$' -or $Token -notmatch '^[A-Za-z0-9]{8,80}$') {
  Write-Output 'Paramètres -Callback / -Token invalides : arrêt.'
  exit 1
}
$UrlSecret = $Callback -replace '/callback$', '/provisioning/secret'

function Envoyer([hashtable]$resultat) {
  $resultat['jeton'] = $Token
  $json = $resultat | ConvertTo-Json -Depth 6 -Compress
  $octets = [Text.Encoding]::UTF8.GetBytes($json)
  Invoke-RestMethod -Uri $Callback -Method Post -Headers @{ 'X-Job-Token' = $Token } `
    -ContentType 'application/json; charset=utf-8' -Body $octets -TimeoutSec 60 | Out-Null
}
function Q([string]$v) { return ($v -replace "'", "''") }
function Rid($sid) { if ("$sid" -match '-(\d+)$') { return [int]$Matches[1] } else { return 0 } }
function Couper([string]$v, [int]$n) { $v = "$v".Trim(); if ($v.Length -gt $n) { return $v.Substring(0, $n) } else { return $v } }

$mdp = $null
try {
  Import-Module ActiveDirectory -ErrorAction Stop
  $p = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($ParamsB64)) | ConvertFrom-Json

  $sam = "$($p.sam)".Trim()
  $upn = "$($p.upn)".Trim()
  $ou = "$($p.ou)".Trim()
  if ($sam -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]{0,19}$') { throw "Identifiant invalide : $sam" }
  if ($upn -notmatch '^[A-Za-z0-9._-]{1,64}@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') { throw "UPN invalide : $upn" }
  if ($sam -match '(?i)admin|^adm[-_.]|^svc[-_.]|krbtgt') { throw "Identifiant réservé : $sam" }

  # Le suffixe de l'UPN doit appartenir à la forêt
  $dom = Get-ADDomain
  $suffixes = @($dom.DNSRoot) + @((Get-ADForest).UPNSuffixes)
  if (-not ($suffixes -contains ($upn.Split('@')[1]))) { throw "Suffixe UPN inconnu de l'AD : $($upn.Split('@')[1])" }

  # L'OU doit exister, et ne pas être celle des contrôleurs de domaine
  if ($ou -match '^OU=Domain Controllers,') { throw "OU refusée : $ou" }
  $conteneur = Get-ADObject -Identity $ou -ErrorAction SilentlyContinue
  if (-not $conteneur -or @('organizationalUnit', 'container') -notcontains $conteneur.ObjectClass) { throw "OU introuvable : $ou" }

  # Jamais d'écrasement
  if (Get-ADUser -Filter "SamAccountName -eq '$(Q $sam)'") { throw "Le compte $sam existe déjà : rien n'a été créé." }
  if (Get-ADUser -Filter "UserPrincipalName -eq '$(Q $upn)'") { throw "L'UPN $upn est déjà utilisé : rien n'a été créé." }

  # Mot de passe provisoire : lu une seule fois auprès du Worker
  $s = Invoke-RestMethod -Uri $UrlSecret -Method Get -Headers @{ 'X-Job-Token' = $Token } -TimeoutSec 60
  $mdp = "$($s.motDePasse)"
  if ($mdp.Length -lt 10) { throw "Mot de passe provisoire indisponible (déjà lu ou expiré) : rien n'a été créé." }

  $prenom = Couper $p.prenom 64
  $nom = Couper $p.nom 64
  $affiche = Couper $(if ("$($p.nomAffiche)".Trim()) { $p.nomAffiche } else { "$prenom $nom" }) 64
  $cn = $affiche
  if (Get-ADObject -Filter "Name -eq '$(Q $cn)'" -SearchBase $ou -SearchScope OneLevel) { $cn = Couper "$affiche ($sam)" 64 }

  $params = @{
    Name                  = $cn
    SamAccountName        = $sam
    UserPrincipalName     = $upn
    DisplayName           = $affiche
    Path                  = $ou
    AccountPassword       = (ConvertTo-SecureString $mdp -AsPlainText -Force)
    Enabled               = $true
    ChangePasswordAtLogon = $true
    Description           = (Couper $p.description 250)
  }
  if ($prenom) { $params['GivenName'] = $prenom }
  if ($nom) { $params['Surname'] = $nom }
  if ("$($p.poste)".Trim()) { $params['Title'] = (Couper $p.poste 128) }
  if ("$($p.mail)" -match '^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') {
    # Adresse de la boîte Microsoft 365 : mail + proxyAddresses (permet à Entra Connect de fusionner les deux comptes si l'OU est synchronisée)
    $params['EmailAddress'] = "$($p.mail)"
    $params['OtherAttributes'] = @{ proxyAddresses = @("SMTP:$($p.mail)") }
  }

  New-ADUser @params
  $mdp = $null; $params['AccountPassword'] = $null
  $cree = Get-ADUser -Identity $sam

  # Groupes : uniquement des groupes de sécurité métier
  $resGroupes = @()
  foreach ($g in @($p.groupes | Select-Object -First 25)) {
    $gs = "$g".Trim()
    if (-not $gs) { continue }
    try {
      $grp = Get-ADGroup -Identity $gs -Properties adminCount
      if ($grp.adminCount -eq 1 -or (Rid $grp.SID) -lt 1000) { $resGroupes += @{ sam = $gs; ok = $false; erreur = 'groupe protégé : refusé' }; continue }
      Add-ADGroupMember -Identity $grp -Members $cree
      $resGroupes += @{ sam = $gs; ok = $true }
    } catch {
      $resGroupes += @{ sam = $gs; ok = $false; erreur = (Couper $_.Exception.Message 200) }
    }
  }

  Envoyer @{
    ok = $true
    serveur = $env:COMPUTERNAME
    sam = $sam
    upn = $upn
    dn = $cree.DistinguishedName
    netbios = $dom.NetBIOSName
    groupes = $resGroupes
  }
  Write-Output "Compte $sam créé dans $ou ($(@($resGroupes | Where-Object { $_.ok }).Count) groupe(s))."
}
catch {
  $mdp = $null
  $msg = "$($_.Exception.Message)"
  Write-Output "Erreur : $msg"
  try { Envoyer @{ ok = $false; erreur = (Couper $msg 400) } } catch { Write-Output "Retour impossible : $($_.Exception.Message)" }
  exit 1
}
