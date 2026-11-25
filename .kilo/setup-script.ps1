# Setup de worktree Calculadora. Corre una vez por worktree nuevo.
$ErrorActionPreference = 'Stop'
Write-Host "== Setup worktree Calculadora =="
foreach ($cmd in 'node', 'npm', 'php', 'pwsh', 'git') {
  $found = Get-Command $cmd -ErrorAction SilentlyContinue
  if ($found) { Write-Host ("OK  {0} -> {1}" -f $cmd, $found.Source) }
  else { Write-Host ("FALTA {0}" -f $cmd) }
}
if (Test-Path 'package.json') {
  Write-Host "Instalando dependencias npm..."
  npm install
}
Write-Host "Listo."