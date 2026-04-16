$ErrorActionPreference = "SilentlyContinue"
Set-Location -LiteralPath $PSScriptRoot\..

$nms = Get-ChildItem -LiteralPath . -Filter node_modules -Recurse -Directory -Force
$nms | Sort-Object { $_.FullName.Length } -Descending | ForEach-Object {
  Remove-Item -LiteralPath $_.FullName -Recurse -Force
}

Get-ChildItem -LiteralPath .\packages -Filter dist -Recurse -Directory -Force | ForEach-Object {
  Remove-Item -LiteralPath $_.FullName -Recurse -Force
}

$out = Join-Path $PWD "apps\desktop\out"
if (Test-Path -LiteralPath $out) {
  Remove-Item -LiteralPath $out -Recurse -Force
}

$turbo = Join-Path $PWD ".turbo"
if (Test-Path -LiteralPath $turbo) {
  Remove-Item -LiteralPath $turbo -Recurse -Force
}

$envFile = Join-Path $PWD ".env"
if (Test-Path -LiteralPath $envFile) {
  Remove-Item -LiteralPath $envFile -Force
}
