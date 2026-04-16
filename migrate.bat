@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo [LocalRAG Studio] Database migrations
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

where docker >nul 2>&1
if errorlevel 1 (
  echo ERROR: Docker was not found. Install Docker Desktop and ensure docker is on PATH.
  exit /b 1
)

echo Ensuring Postgres container is running ...
docker compose up -d
if errorlevel 1 (
  echo ERROR: docker compose up failed. Is Docker Desktop running?
  exit /b 1
)

echo Waiting until Postgres accepts connections on port 5433 ...
set /a WAITCOUNT=0
:wait_pg
docker compose exec -T db pg_isready -U rag -d ragstudio >nul 2>&1
if not errorlevel 1 goto :pg_ready
set /a WAITCOUNT+=1
if %WAITCOUNT% GEQ 60 goto :pg_timeout
timeout /t 2 /nobreak >nul
goto :wait_pg

:pg_timeout
echo ERROR: Postgres did not become ready in time. Try: docker compose logs db
echo If you changed the host port in docker-compose.yml, set DATABASE_URL in .env to match.
exit /b 1

:pg_ready

set "USE_NPX=0"
where pnpm >nul 2>&1
if errorlevel 1 set "USE_NPX=1"

if "%USE_NPX%"=="0" (
  call pnpm run db:migrate
) else (
  call npx --yes pnpm@10.33.0 run db:migrate
)

exit /b %ERRORLEVEL%
