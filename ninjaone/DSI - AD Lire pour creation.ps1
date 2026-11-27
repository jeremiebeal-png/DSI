<#
  DSI - AD Lire pour creation
  ---------------------------------------------------------------------------
  Script NinjaOne lancé par Oscar (Worker dsi-hotel-agent) sur le contrôleur de domaine
  de l'hôtel quand un ticket « Arrivée collaborateur » arrive.

  LECTURE SEULE : aucune modification de l'Active Directory.
  Renvoie au Worker (POST -Callback, en-tête X-Job-Token) :
    - le domaine et les suffixes UPN ;
    - les OU (nombre de comptes actifs, comptes synchronisés Entra Connect, comptes créés depuis 1 an) ;
    - les groupes de sécurité « métier » (jamais les groupes protégés ni les groupes intégrés) ;
    - les comptes existants qui ressemblent au nouveau collaborateur (identifiant ou prénom + nom) ;
    - reprise de poste (« Modification » : un nouveau collaborateur reprend le compte d'un ancien) :
      le ou les comptes correspondant à l'ancien collaborateur (paramètre cible : adresse mail et/ou nom),
      avec leurs groupes, pour que le technicien choisisse le compte à reprendre.

  NinjaOne : Windows PowerShell, exécuter en tant que System, catégorie au choix.
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

function Envoyer([hashtable]$resultat) {
  $resultat['jeton'] = $Token
  $json = $resultat | ConvertTo-Json -Depth 6 -Compress
  $octets = [Text.Encoding]::UTF8.GetBytes($json)
  Invoke-RestMethod -Uri $Callback -Method Post -Headers @{ 'X-Job-Token' = $Token } `
    -ContentType 'application/json; charset=utf-8' -Body $octets -TimeoutSec 60 | Out-Null
}

# Échappe une valeur placée entre apostrophes dans un filtre -Filter de l'AD
function Q([string]$v) { return ($v -replace "'", "''") }
function Parent([string]$dn) { return ($dn -replace '^(?:CN|OU)=(?:\\,|[^,])+,', '') }
function Rid($sid) { if ("$sid" -match '-(\d+)$') { return [int]$Matches[1] } else { return 0 } }

try {
  Import-Module ActiveDirectory -ErrorAction Stop

  $p = @{}
  if ($ParamsB64) {
    $p = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($ParamsB64)) | ConvertFrom-Json
  }

  $dom = Get-ADDomain
  $foret = Get-ADForest
  $suffixes = @($dom.DNSRoot) + @($foret.UPNSuffixes) | Where-Object { $_ } | Select-Object -Unique

  # ---- Comptes actifs, regroupés par OU ----
  $utilisateurs = @(Get-ADUser -Filter 'Enabled -eq $true' -Properties 'mS-DS-ConsistencyGuid', whenCreated |
    Where-Object { $_.SamAccountName -notmatch '^(krbtgt|Guest|Invit|DefaultAccount|WDAGUtility)' })
  $ilYaUnAn = (Get-Date).AddDays(-365)
  $parOu = @{}
  foreach ($u in $utilisateurs) {
    $par = Parent $u.DistinguishedName
    if (-not $parOu.ContainsKey($par)) { $parOu[$par] = @{ n = 0; sync = 0; recents = 0 } }
    $parOu[$par].n++
    if ($u.'mS-DS-ConsistencyGuid') { $parOu[$par].sync++ }
    if ($u.whenCreated -gt $ilYaUnAn) { $parOu[$par].recents++ }
  }

  $ous = @()
  $listeOu = @(Get-ADOrganizationalUnit -Filter * | Select-Object -ExpandProperty DistinguishedName)
  $listeOu += "CN=Users,$($dom.DistinguishedName)"
  foreach ($dn in $listeOu) {
    if ($dn -match '^OU=Domain Controllers,') { continue }
    $c = $parOu[$dn]
    $ous += @{ dn = $dn; n = $(if ($c) { $c.n } else { 0 }); sync = $(if ($c) { $c.sync } else { 0 }); recents = $(if ($c) { $c.recents } else { 0 }) }
  }
  # Les OU qui contiennent des comptes d'abord, 150 au plus (taille du retour limitée)
  $ous = @($ous | Sort-Object -Property @{ Expression = { $_.n }; Descending = $true } | Select-Object -First 150)

  # ---- Groupes de sécurité « métier » : ni protégés (adminCount=1), ni intégrés (RID < 1000), hors Builtin ----
  $groupes = @(Get-ADGroup -Filter 'GroupCategory -eq "Security"' -Properties adminCount, Description |
    Where-Object { $_.adminCount -ne 1 -and (Rid $_.SID) -ge 1000 -and $_.DistinguishedName -notmatch ',CN=Builtin,' } |
    Sort-Object Name | Select-Object -First 300 |
    ForEach-Object {
      $g = @{ sam = $_.SamAccountName; ou = (Parent $_.DistinguishedName) }
      if ($_.Name -ne $_.SamAccountName) { $g['nom'] = $_.Name }
      if ($_.Description) { $g['desc'] = "$($_.Description)".Substring(0, [Math]::Min(60, "$($_.Description)".Length)) }
      $g
    })

  # ---- Comptes existants proches du nouveau collaborateur ----
  $vus = @{}
  $homonymes = @()
  $candidats = @($p.sams | Where-Object { "$_" -match '^[A-Za-z0-9._-]{1,20}$' } | Select-Object -First 5)
  $existants = @{}
  foreach ($s in $candidats) {
    $u = Get-ADUser -Filter "SamAccountName -eq '$(Q $s)'" -Properties DisplayName
    $existants[$s] = [bool]$u
    if ($u -and -not $vus[$u.SamAccountName]) { $vus[$u.SamAccountName] = 1; $homonymes += @{ sam = $u.SamAccountName; nom = $u.DisplayName; actif = $u.Enabled; ou = (Parent $u.DistinguishedName) } }
  }
  if ("$($p.nom)".Trim()) {
    $filtre = "Surname -eq '$(Q "$($p.nom)".Trim())'"
    if ("$($p.prenom)".Trim()) { $filtre += " -and GivenName -eq '$(Q "$($p.prenom)".Trim())'" }
    foreach ($u in @(Get-ADUser -Filter $filtre -Properties DisplayName | Select-Object -First 10)) {
      if (-not $vus[$u.SamAccountName]) { $vus[$u.SamAccountName] = 1; $homonymes += @{ sam = $u.SamAccountName; nom = $u.DisplayName; actif = $u.Enabled; ou = (Parent $u.DistinguishedName) } }
    }
  }
  # UPN déjà utilisés (identifiant libre mais UPN pris par un autre compte)
  $upnPris = @()
  foreach ($s in $candidats) { foreach ($suf in $suffixes) {
    $upn = "$s@$suf"
    if (Get-ADUser -Filter "UserPrincipalName -eq '$(Q $upn)'") { $upnPris += $upn }
  } }

  # ---- Reprise de poste : compte de l'ancien collaborateur ----
  $cibles = @()
  if ($p.cible) {
    $vusC = @{}
    $trouves = @()
    $mailC = "$($p.cible.mail)".Trim()
    if ($mailC -match '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') {
      $trouves += @(Get-ADUser -Filter "UserPrincipalName -eq '$(Q $mailC)' -or mail -eq '$(Q $mailC)' -or proxyAddresses -eq 'smtp:$(Q $mailC)'" -Properties DisplayName, mail, proxyAddresses, memberOf, adminCount, 'mS-DS-ConsistencyGuid', lastLogonTimestamp)
      $loc = $mailC.Split('@')[0]
      if ($loc.Length -le 20) { $trouves += @(Get-ADUser -Filter "SamAccountName -eq '$(Q $loc)'" -Properties DisplayName, mail, proxyAddresses, memberOf, adminCount, 'mS-DS-ConsistencyGuid', lastLogonTimestamp) }
    }
    if ("$($p.cible.nom)".Trim()) {
      $f2 = "Surname -eq '$(Q "$($p.cible.nom)".Trim())'"
      if ("$($p.cible.prenom)".Trim()) { $f2 += " -and GivenName -eq '$(Q "$($p.cible.prenom)".Trim())'" }
      $trouves += @(Get-ADUser -Filter $f2 -Properties DisplayName, mail, proxyAddresses, memberOf, adminCount, 'mS-DS-ConsistencyGuid', lastLogonTimestamp | Select-Object -First 5)
    }
    foreach ($u in $trouves) {
      if (-not $u -or $vusC[$u.SamAccountName]) { continue }
      $vusC[$u.SamAccountName] = 1
      $grs = @($u.memberOf | ForEach-Object { try { (Get-ADGroup -Identity $_).SamAccountName } catch { } } | Where-Object { $_ })
      $dernier = $null
      if ($u.lastLogonTimestamp) { $dernier = [DateTime]::FromFileTime($u.lastLogonTimestamp).ToString('yyyy-MM-dd') }
      $cibles += @{
        sam = $u.SamAccountName; upn = $u.UserPrincipalName; nom = $u.DisplayName; mail = $u.mail
        actif = $u.Enabled; ou = (Parent $u.DistinguishedName); protege = ($u.adminCount -eq 1)
        synchro = [bool]$u.'mS-DS-ConsistencyGuid'; groupes = $grs; derniereConnexion = $dernier
        proxys = @($u.proxyAddresses | Select-Object -First 10)
      }
    }
  }

  $pol = Get-ADDefaultDomainPasswordPolicy
  $adsync = [bool](Get-Service -Name ADSync -ErrorAction SilentlyContinue)

  Envoyer @{
    ok = $true
    serveur = $env:COMPUTERNAME
    domaine = $dom.DNSRoot
    netbios = $dom.NetBIOSName
    domaineDn = $dom.DistinguishedName
    suffixes = @($suffixes)
    ous = $ous
    groupes = $groupes
    existants = $existants
    homonymes = $homonymes
    upnPris = $upnPris
    cibles = $cibles
    mdpLongueurMin = $pol.MinPasswordLength
    mdpComplexite = $pol.ComplexityEnabled
    adsyncSurCeServeur = $adsync
  }
  Write-Output "Lecture AD envoyée : $($ous.Count) OU, $($groupes.Count) groupes, $($homonymes.Count) compte(s) proche(s)."
}
catch {
  $msg = "$($_.Exception.Message)"
  Write-Output "Erreur : $msg"
  try { Envoyer @{ ok = $false; erreur = $msg.Substring(0, [Math]::Min(400, $msg.Length)) } } catch { Write-Output "Retour impossible : $($_.Exception.Message)" }
  exit 1
}
