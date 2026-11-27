<#
  DSI - AD Reprendre compte
  ---------------------------------------------------------------------------
  Script NinjaOne lancé par le Worker dsi-hotel-agent UNIQUEMENT après le « Oui » d'un technicien
  DSI Hotel (session MFA) dans le portail, sur un ticket « Arrivée collaborateur » de type « Modification »
  (reprise de poste) validé par le RH / la direction.

  Un nouveau collaborateur reprend le compte d'un ancien : le MÊME compte est renommé.
    - identifiant (sAMAccountName), UPN, prénom, nom, nom affiché, poste, nom de l'objet (CN) ;
    - adresse mail : la nouvelle devient l'adresse principale (SMTP:), l'ancienne reste en alias (smtp:)
      -> si le compte est synchronisé (Entra Connect), Microsoft 365 suit au prochain cycle ;
    - nouveau mot de passe provisoire, « changer à la prochaine ouverture de session » coché,
      compte réactivé et déverrouillé s'il l'était ;
    - groupes demandés AJOUTÉS (aucun groupe retiré : la liste des groupes actuels est renvoyée au technicien).
  Garde-fous : jamais un compte protégé (adminCount = 1) ou réservé (admin, svc…), jamais un groupe protégé,
  identifiant / UPN refusés s'ils appartiennent à un autre compte ; le mot de passe n'est PAS un paramètre :
  il est lu une seule fois auprès du Worker avec le jeton de la tâche.

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
$ReMail = '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'

$mdp = $null
try {
  Import-Module ActiveDirectory -ErrorAction Stop
  $p = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($ParamsB64)) | ConvertFrom-Json

  $cibleSam = "$($p.cibleSam)".Trim()
  $sam = "$($p.sam)".Trim()
  $upn = "$($p.upn)".Trim()
  if ($cibleSam -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]{0,19}$') { throw "Compte à reprendre invalide : $cibleSam" }
  if ($sam -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]{0,19}$') { throw "Nouvel identifiant invalide : $sam" }
  if ($upn -notmatch '^[A-Za-z0-9._-]{1,64}@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') { throw "UPN invalide : $upn" }
  foreach ($x in @($cibleSam, $sam)) { if ($x -match '(?i)admin|^adm[-_.]|^svc[-_.]|krbtgt|^guest$|^invit') { throw "Compte réservé : $x" } }

  $dom = Get-ADDomain
  $suffixes = @($dom.DNSRoot) + @((Get-ADForest).UPNSuffixes)
  if (-not ($suffixes -contains ($upn.Split('@')[1]))) { throw "Suffixe UPN inconnu de l'AD : $($upn.Split('@')[1])" }

  $u = Get-ADUser -Identity $cibleSam -Properties adminCount, memberOf, proxyAddresses, mail, DisplayName, 'mS-DS-ConsistencyGuid'
  if ($u.adminCount -eq 1) { throw "Le compte $cibleSam est un compte protégé (administration) : refusé." }
  $avant = @{ sam = $u.SamAccountName; upn = $u.UserPrincipalName; nom = $u.DisplayName; mail = $u.mail; dn = $u.DistinguishedName; actif = $u.Enabled }

  # Le nouvel identifiant / UPN ne doivent appartenir à aucun AUTRE compte
  if ($sam -ne $u.SamAccountName) {
    $autre = Get-ADUser -Filter "SamAccountName -eq '$(Q $sam)'"
    if ($autre -and $autre.SID -ne $u.SID) { throw "L'identifiant $sam appartient déjà à un autre compte : rien n'a été modifié." }
  }
  $autreUpn = Get-ADUser -Filter "UserPrincipalName -eq '$(Q $upn)'"
  if ($autreUpn -and $autreUpn.SID -ne $u.SID) { throw "L'UPN $upn appartient déjà à un autre compte : rien n'a été modifié." }

  # Mot de passe provisoire : lu une seule fois auprès du Worker (avant toute modification)
  $s = Invoke-RestMethod -Uri $UrlSecret -Method Get -Headers @{ 'X-Job-Token' = $Token } -TimeoutSec 60
  $mdp = "$($s.motDePasse)"
  if ($mdp.Length -lt 10) { throw "Mot de passe provisoire indisponible (déjà lu ou expiré) : rien n'a été modifié." }

  $prenom = Couper $p.prenom 64
  $nom = Couper $p.nom 64
  $affiche = Couper $(if ("$($p.nomAffiche)".Trim()) { $p.nomAffiche } else { "$prenom $nom" }) 64
  $etapes = @()

  # 1) Identité
  $maj = @{ Identity = $u; SamAccountName = $sam; UserPrincipalName = $upn; DisplayName = $affiche }
  $vider = @()
  if ($prenom) { $maj['GivenName'] = $prenom } else { $vider += 'givenName' }
  if ($nom) { $maj['Surname'] = $nom } else { $vider += 'sn' }
  if ("$($p.poste)".Trim()) { $maj['Title'] = (Couper $p.poste 128) } else { $vider += 'title' }
  if ("$($p.description)".Trim()) { $maj['Description'] = (Couper $p.description 250) }
  if ($vider.Count) { $maj['Clear'] = $vider }
  Set-ADUser @maj
  $etapes += @{ etape = "Identité : $($avant.sam) -> $sam ($upn)"; ok = $true }

  # 2) Adresse mail : nouvelle adresse principale, ancienne(s) gardée(s) en alias
  $mail = "$($p.mail)".Trim().ToLower()
  if ($mail -match $ReMail) {
    $proxys = @()
    $proxys += "SMTP:$mail"
    foreach ($x in @($u.proxyAddresses)) {
      $v = "$x"
      if ($v -match '^(?i)smtp:(.+)$') {
        $adr = $Matches[1].ToLower()
        if ($adr -ne $mail -and -not ($proxys -contains "smtp:$adr")) { $proxys += "smtp:$adr" }
      } elseif ($v) { $proxys += $v }   # X500, SIP… conservés tels quels
    }
    foreach ($ancien in @("$($p.ancienMail)".Trim().ToLower(), "$($u.mail)".Trim().ToLower())) {
      if ($ancien -match $ReMail -and $ancien -ne $mail -and -not ($proxys -contains "smtp:$ancien")) { $proxys += "smtp:$ancien" }
    }
    Set-ADUser -Identity $u -EmailAddress $mail -Replace @{ proxyAddresses = [string[]]$proxys }
    $etapes += @{ etape = "Adresse principale $mail (alias : $(@($proxys | Where-Object { $_ -clike 'smtp:*' } | ForEach-Object { $_.Substring(5) }) -join ', '))"; ok = $true }
  }

  # 3) Nom de l'objet (CN) dans l'OU
  $ou = ($u.DistinguishedName -replace '^CN=(?:\\,|[^,])+,', '')
  $cn = $affiche
  $doublon = Get-ADObject -Filter "Name -eq '$(Q $cn)'" -SearchBase $ou -SearchScope OneLevel
  if ($doublon -and $doublon.ObjectGUID -ne $u.ObjectGUID) { $cn = Couper "$affiche ($sam)" 64 }
  try { Rename-ADObject -Identity $u.DistinguishedName -NewName $cn; $etapes += @{ etape = "Objet renommé : $cn"; ok = $true } }
  catch { $etapes += @{ etape = "Renommage de l'objet AD"; ok = $false; erreur = (Couper $_.Exception.Message 200) } }
  $u = Get-ADUser -Identity $u.SID

  # 4) Mot de passe provisoire, changement à la prochaine ouverture de session, compte actif et déverrouillé
  Set-ADAccountPassword -Identity $u -Reset -NewPassword (ConvertTo-SecureString $mdp -AsPlainText -Force)
  $mdp = $null
  Set-ADUser -Identity $u -ChangePasswordAtLogon $true
  if (-not $u.Enabled) { Enable-ADAccount -Identity $u; $etapes += @{ etape = 'Compte réactivé'; ok = $true } }
  Unlock-ADAccount -Identity $u -ErrorAction SilentlyContinue
  $etapes += @{ etape = 'Nouveau mot de passe provisoire (à changer à la première ouverture de session)'; ok = $true }

  # 5) Groupes ajoutés (métier uniquement) ; aucun groupe retiré
  $resGroupes = @()
  foreach ($g in @($p.groupes | Select-Object -First 25)) {
    $gs = "$g".Trim()
    if (-not $gs) { continue }
    try {
      $grp = Get-ADGroup -Identity $gs -Properties adminCount
      if ($grp.adminCount -eq 1 -or (Rid $grp.SID) -lt 1000) { $resGroupes += @{ sam = $gs; ok = $false; erreur = 'groupe protégé : refusé' }; continue }
      Add-ADGroupMember -Identity $grp -Members $u
      $resGroupes += @{ sam = $gs; ok = $true }
    } catch {
      $resGroupes += @{ sam = $gs; ok = $false; erreur = (Couper $_.Exception.Message 200) }
    }
  }
  $groupesActuels = @((Get-ADUser -Identity $u -Properties memberOf).memberOf | ForEach-Object { try { (Get-ADGroup -Identity $_).SamAccountName } catch { } } | Where-Object { $_ })

  Envoyer @{
    ok = $true
    serveur = $env:COMPUTERNAME
    sam = $sam
    upn = $upn
    dn = $u.DistinguishedName
    netbios = $dom.NetBIOSName
    avant = $avant
    synchro = [bool]$u.'mS-DS-ConsistencyGuid'
    etapes = $etapes
    groupes = $resGroupes
    groupesActuels = $groupesActuels
  }
  Write-Output "Compte $($avant.sam) repris : $sam ($upn), $(@($resGroupes | Where-Object { $_.ok }).Count) groupe(s) ajouté(s)."
}
catch {
  $mdp = $null
  $msg = "$($_.Exception.Message)"
  Write-Output "Erreur : $msg"
  try { Envoyer @{ ok = $false; erreur = (Couper $msg 400) } } catch { Write-Output "Retour impossible : $($_.Exception.Message)" }
  exit 1
}
