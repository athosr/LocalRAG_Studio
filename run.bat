@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo [LocalRAG Studio] Starting dev (Electron)
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js was not found. Install Node.js 24 LTS or newer.
  exit /b 1
)

node -e "const [m]=process.versions.node.split('.'); process.exit(+m<24?1:0)" 2>nul
if errorlevel 1 (
  echo ERROR: Node.js 24 or newer is required. You have:
  node -v
  exit /b 1
)

if not exist "node_modules" (
  echo ERROR: Dependencies are missing. Run setup.bat first.
  exit /b 1
)

set "USE_NPX=0"
where pnpm >nul 2>&1
if errorlevel 1 set "USE_NPX=1"

if "%USE_NPX%"=="0" (
  call pnpm run dev
) else (
  call npx --yes pnpm@10.33.0 run dev
)

exit /b %ERRORLEVEL%
