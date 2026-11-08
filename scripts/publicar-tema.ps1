<#
  publicar-tema.ps1 — Publica los artefactos del COTIZADOR en el repo del TEMA.

  Flujo vigente (spec 020, D8):
    1) npm run build:js && npm run build:css   (genera el bundle y el CSS)
    2) npm run pub:tema                        (este script: copia y verifica SHA256)
    3) git add/commit EN EL REPO DEL TEMA      (el deploy sube SOLO lo versionado)
    4) Implementar en Hostinger

  Reglas:
    - `datos_config.json` NO se publica: es dato del ADMIN y vive en el servidor.
    - NUNCA copiar archivos al servidor por FTP/panel: deja archivos untracked y el
      `git pull` del deploy ABORTA ("untracked working tree files would be
      overwritten by merge"). Fue la causa del deploy fallido del 2026-11-08.

  Uso:
    npm run pub:tema
    pwsh -NoProfile -File scripts/publicar-tema.ps1 -Destino 'D:\otro\muyunicos\assets'
#>
[CmdletBinding()]
param(
    # Directorio `assets` del tema. Por defecto el repo hermano `muyunicos`.
    [string] $Destino = '..\muyunicos\assets'
)

$ErrorActionPreference = 'Stop'

$raiz = Split-Path -Parent $PSScriptRoot
$origenAssets = Join-Path $raiz 'assets'
if (-not [System.IO.Path]::IsPathRooted($Destino)) { $Destino = Join-Path $raiz $Destino }
$Destino = [System.IO.Path]::GetFullPath($Destino)

$pares = @(
    @('js\calculadora_stickers.js', 'js\calculadora_stickers.js'),
    @('css\calculadora_stickers.css', 'css\calculadora_stickers.css'),
    @('datos_config_etag.php', 'datos_config_etag.php'),
    @('guardar_datos.php', 'guardar_datos.php')
)

if (-not (Test-Path $Destino)) {
    throw "No existe el destino del tema: $Destino. Revisa -Destino o el checkout de muyunicos."
}

$bundle = Join-Path $origenAssets 'js\calculadora_stickers.js'
if (-not (Test-Path $bundle)) {
    throw "Falta el bundle ($bundle). Corre primero: npm run build:js"
}
$fuenteMasNueva = Get-ChildItem (Join-Path $raiz 'src') -Recurse -File -Include *.ts, *.tsx -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($fuenteMasNueva -and ((Get-Item $bundle).LastWriteTime -lt $fuenteMasNueva.LastWriteTime)) {
    Write-Warning ("El bundle es MAS VIEJO que {0}: corre 'npm run build:js' antes de publicar." -f $fuenteMasNueva.Name)
}

$ok = 0
foreach ($p in $pares) {
    $src = Join-Path $origenAssets $p[0]
    $dst = Join-Path $Destino $p[1]
    if (-not (Test-Path $src)) { throw "Falta el archivo de origen: $src" }
    $dirDst = Split-Path -Parent $dst
    if (-not (Test-Path $dirDst)) { New-Item -ItemType Directory -Force -Path $dirDst | Out-Null }
    Copy-Item -LiteralPath $src -Destination $dst -Force
    $h1 = (Get-FileHash -LiteralPath $src -Algorithm SHA256).Hash
    $h2 = (Get-FileHash -LiteralPath $dst -Algorithm SHA256).Hash
    if ($h1 -ne $h2) { throw "Copia corrupta: $($p[1]) (hash distinto)" }
    $ok++
    Write-Host ("  OK   {0}  ({1} bytes)" -f $p[1], (Get-Item $dst).Length)
}

$temaRaiz = Split-Path -Parent $Destino
Write-Host ''
Write-Host ("PUBLICAR OK ({0} archivos) -> {1}" -f $ok, $Destino)
if (Test-Path (Join-Path $temaRaiz '.git')) {
    Write-Host 'Pendiente en el repo del TEMA (commitear y despues Implementar):'
    & git -C $temaRaiz status --porcelain -- assets inc/cotizador.php
}