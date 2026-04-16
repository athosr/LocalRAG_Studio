@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo [LocalRAG Studio] Setup - full reset
echo This removes Docker volume for this project, all node_modules, package dist folders,
echo apps\desktop\out, and .env - then copies .env.example to .env again.
echo Missing Node.js 24+ or Python 3.14 are installed with winget when possible.
echo Then rag-service ^(pip^), pnpm, and DB migrations run.
echo.

call :ensure_winget
if errorlevel 1 exit /b 1
call :ensure_node_24
if errorlevel 1 exit /b 1

where docker >nul 2>&1
if errorlevel 1 (
  echo ERROR: Docker was not found. Install Docker Desktop and ensure docker is on PATH.
  exit /b 1
)

if not exist ".env.example" (
  echo ERROR: .env.example is missing. Restore it from the repository, then re-run setup.bat.
  exit /b 1
)

echo Stopping Docker Compose and removing volumes for this project ...
docker compose down -v
if errorlevel 1 (
  echo WARNING: docker compose down -v failed - Docker may be stopped. Continuing cleanup...
)

echo Deleting node_modules, build outputs, and .env ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\clean-workspace.ps1"
if errorlevel 1 (
  echo ERROR: Workspace cleanup script failed.
  exit /b 1
)

echo Creating fresh .env from .env.example ...
copy /Y ".env.example" ".env" >nul
if errorlevel 1 (
  echo ERROR: Could not copy .env.example to .env.
  exit /b 1
)

echo Starting Docker Compose database ...
docker compose up -d --build
if errorlevel 1 (
  echo ERROR: docker compose up failed.
  exit /b 1
)

echo Waiting until Postgres in this Docker container accepts connections ...
set /a WAITCOUNT=0
:wait_pg
docker compose exec -T db pg_isready -U rag -d ragstudio >nul 2>&1
if not errorlevel 1 goto :pg_ready
set /a WAITCOUNT+=1
if %WAITCOUNT% GEQ 60 goto :pg_timeout
timeout /t 2 /nobreak >nul
goto :wait_pg

:pg_timeout
echo ERROR: Postgres did not become ready in time. Check: docker compose logs db
exit /b 1

:pg_ready

if not defined LOCALRAG_PYTHON (
  for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env") do (
    if /i "%%a"=="LOCALRAG_PYTHON" if not "%%b"=="" set "LOCALRAG_PYTHON=%%b"
  )
)

call :ensure_python314
if errorlevel 1 exit /b 1

echo Installing rag-service Python dependencies ^(3.14+^) ...
set "RAG_PY_OK=0"
if defined LOCALRAG_PYTHON (
  "%LOCALRAG_PYTHON%" -c "import sys; raise SystemExit(0 if sys.version_info[:2]>=(3,14) else 1)" 2>nul
  if not errorlevel 1 (
    set "RAG_PY_OK=1"
    pushd rag-service
    "%LOCALRAG_PYTHON%" -m pip install -e ".[dev]"
    if errorlevel 1 (
      echo ERROR: pip install failed in rag-service ^(LOCALRAG_PYTHON^).
      popd
      exit /b 1
    )
    popd
  ) else (
    echo ERROR: LOCALRAG_PYTHON must be Python 3.14 or newer. You have:
    "%LOCALRAG_PYTHON%" -V
    exit /b 1
  )
)

if "%RAG_PY_OK%"=="0" (
  python -c "import sys; raise SystemExit(0 if sys.version_info[:2]>=(3,14) else 1)" 2>nul
  if not errorlevel 1 (
    set "RAG_PY_OK=1"
    pushd rag-service
    python -m pip install -e ".[dev]"
    if errorlevel 1 (
      echo ERROR: pip install failed in rag-service.
      popd
      exit /b 1
    )
    popd
  )
)

if "%RAG_PY_OK%"=="0" (
  where py >nul 2>&1
  if errorlevel 1 goto :python_missing
  py -3.14 -c "import sys; raise SystemExit(0 if sys.version_info[:2]>=(3,14) else 1)" 2>nul
  if errorlevel 1 goto :python_missing
  set "RAG_PY_OK=1"
  pushd rag-service
  py -3.14 -m pip install -e ".[dev]"
  if errorlevel 1 (
    echo ERROR: pip install failed in rag-service.
    popd
    exit /b 1
  )
  popd
)

goto :after_rag_python

:python_missing
echo ERROR: Python 3.14+ not found. Install Python 3.14 and put python.exe on PATH, or use the
echo        Windows py launcher ^(py -3.14^), or set LOCALRAG_PYTHON in .env to python.exe ^(see .env.example^).
exit /b 1

:after_rag_python

set "USE_NPX=0"
where pnpm >nul 2>&1
if errorlevel 1 set "USE_NPX=1"

if "%USE_NPX%"=="0" (
  echo Installing dependencies with pnpm ...
  call pnpm install
  if errorlevel 1 exit /b 1
  echo Building workspace packages ...
  call pnpm run build:packages
  if errorlevel 1 exit /b 1
  echo Running database migrations ...
  call pnpm run db:migrate
  if errorlevel 1 goto :migrate_failed
) else (
  echo pnpm not found; using npx pnpm@10.33.0 ...
  call npx --yes pnpm@10.33.0 install
  if errorlevel 1 exit /b 1
  echo Building workspace packages ...
  call npx --yes pnpm@10.33.0 run build:packages
  if errorlevel 1 exit /b 1
  echo Running database migrations ...
  call npx --yes pnpm@10.33.0 run db:migrate
  if errorlevel 1 goto :migrate_failed
)
goto :after_migrate

:migrate_failed
echo.
echo MIGRATE FAILED - common causes:
echo   1) DATABASE_URL in .env must use host port 5433: postgresql://rag:rag@127.0.0.1:5433/ragstudio
echo   2) Another app using host port 5433 - change the left side in docker-compose.yml ports and .env to match.
echo   3) packages\db\dist missing - run: pnpm run build:packages
echo   4) Docker not healthy - run: docker compose logs db
exit /b 1

:after_migrate

echo.
echo Setup finished from a clean state. Run run.bat to start the desktop app.
exit /b 0

:refresh_path_from_registry
for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')"`) do set "PATH=%%P"
exit /b 0

:ensure_winget
where winget >nul 2>&1
if errorlevel 1 (
  echo ERROR: winget was not found. Install or update "App Installer" from the Microsoft Store,
  echo        or use Windows 10 1809+ / Windows 11 with winget enabled.
  exit /b 1
)
exit /b 0

:ensure_node_24
set "NODE_OK=0"
where node >nul 2>&1
if not errorlevel 1 (
  node -e "const [m]=process.versions.node.split('.'); process.exit(+m<24?1:0)" 2>nul
  if not errorlevel 1 set "NODE_OK=1"
)
if "%NODE_OK%"=="1" exit /b 0

echo Node.js 24+ not found. Installing Node.js LTS via winget ^(OpenJS.NodeJS.LTS^) ...
winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
if errorlevel 1 (
  echo ERROR: winget could not install Node.js. Install Node.js 24+ from https://nodejs.org and re-run setup.bat.
  exit /b 1
)
call :refresh_path_from_registry
where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js was installed but is not on PATH in this session. Close the terminal and run setup.bat again.
  exit /b 1
)
node -e "const [m]=process.versions.node.split('.'); process.exit(+m<24?1:0)" 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is still below version 24. You have:
  node -v
  exit /b 1
)
exit /b 0

:ensure_python314
set "PY314_OK=0"
if defined LOCALRAG_PYTHON (
  "%LOCALRAG_PYTHON%" -c "import sys; raise SystemExit(0 if sys.version_info[:2]>=(3,14) else 1)" 2>nul
  if not errorlevel 1 set "PY314_OK=1"
)
if "%PY314_OK%"=="0" (
  python -c "import sys; raise SystemExit(0 if sys.version_info[:2]>=(3,14) else 1)" 2>nul
  if not errorlevel 1 set "PY314_OK=1"
)
if "%PY314_OK%"=="0" (
  where py >nul 2>&1
  if not errorlevel 1 (
    py -3.14 -c "import sys; raise SystemExit(0 if sys.version_info[:2]>=(3,14) else 1)" 2>nul
    if not errorlevel 1 set "PY314_OK=1"
  )
)
if "%PY314_OK%"=="1" goto :python314_finalize

echo Python 3.14+ not found. Installing Python 3.14 via winget ^(Python.Python.3.14^) ...
winget install --id Python.Python.3.14 -e --accept-package-agreements --accept-source-agreements
if errorlevel 1 (
  echo ERROR: winget could not install Python. Install Python 3.14 from https://www.python.org and re-run setup.bat.
  exit /b 1
)
call :refresh_path_from_registry
set "PY314_OK=0"
python -c "import sys; raise SystemExit(0 if sys.version_info[:2]>=(3,14) else 1)" 2>nul
if not errorlevel 1 set "PY314_OK=1"
if "%PY314_OK%"=="0" (
  where py >nul 2>&1
  if not errorlevel 1 (
    py -3.14 -c "import sys; raise SystemExit(0 if sys.version_info[:2]>=(3,14) else 1)" 2>nul
    if not errorlevel 1 set "PY314_OK=1"
  )
)
if "%PY314_OK%"=="0" (
  echo ERROR: Python 3.14 is not on PATH after install. Close the terminal and run setup.bat again.
  echo If LOCALRAG_PYTHON in .env points at an older Python, remove or update that line.
  exit /b 1
)
goto :python314_finalize

:python314_finalize
if defined LOCALRAG_PYTHON (
  "%LOCALRAG_PYTHON%" -c "import sys; raise SystemExit(0 if sys.version_info[:2]>=(3,14) else 1)" 2>nul
  if errorlevel 1 (
    echo NOTE: LOCALRAG_PYTHON points to Python below 3.14; using python on PATH for this setup.
    set "LOCALRAG_PYTHON="
  )
)
exit /b 0
