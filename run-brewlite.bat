@echo off
setlocal
title BrewLite - khoi dong
cd /d "%~dp0"
echo ===== BrewLite =====

rem --- 1. Kiem tra Node.js ---
where node >nul 2>nul
if errorlevel 1 (
  echo [LOI] May chua cai Node.js. Hay cai ban LTS tu nodejs.org, roi chay lai file nay.
  start "" https://nodejs.org
  pause
  exit /b 1
)
if not exist "backend\package.json" goto wrongplace
if not exist "frontend\package.json" goto wrongplace

rem --- 2. Bat PostgreSQL bang Docker ---
where docker >nul 2>nul
if errorlevel 1 (
  echo [CANH BAO] Chua cai Docker Desktop. BrewLite can PostgreSQL.
  echo Cai Docker Desktop tu docker.com, hoac tu cai PostgreSQL roi sua DATABASE_URL trong backend\.env
  start "" https://www.docker.com/products/docker-desktop/
  pause
  goto envfiles
)
docker info >nul 2>nul
if errorlevel 1 (
  echo [LOI] Docker Desktop chua chay. Mo Docker Desktop, doi bieu tuong ca voi ngung nhap nhay, roi chay lai file nay.
  pause
  exit /b 1
)
echo Dang bat PostgreSQL...
docker compose up -d db
if errorlevel 1 goto fail
set /a TRIES=0
:waitdb
set /a TRIES+=1
if %TRIES% gtr 40 (
  echo [LOI] PostgreSQL chua san sang sau 2 phut.
  pause
  exit /b 1
)
docker compose exec -T db pg_isready -U brewlite -d brewlite >nul 2>nul
if errorlevel 1 (
  timeout /t 3 /nobreak >nul
  goto waitdb
)
echo PostgreSQL da san sang.

:envfiles
rem --- 3. Tao file moi truong; them bien con thieu vao file cu ---
if not exist "backend\.env" copy "backend\.env.example" "backend\.env" >nul
findstr /b /c:"DATABASE_URL=" "backend\.env" >nul || >> "backend\.env" echo DATABASE_URL=postgresql://brewlite:brewlite@localhost:5433/brewlite?schema=public
findstr /b /c:"JWT_SECRET=" "backend\.env" >nul || >> "backend\.env" echo JWT_SECRET=doi-chuoi-nay-thanh-mot-chuoi-bi-mat-dai
findstr /b /c:"VNP_TMN_CODE=" "backend\.env" >nul || (>> "backend\.env" echo VNP_TMN_CODE=& >> "backend\.env" echo VNP_HASH_SECRET=)
findstr /r /b /c:"VNP_TMN_CODE=." "backend\.env" >nul
if errorlevel 1 (
  echo [CHU Y] Chua dien ma VNPay sandbox nen chua thanh toan VNPay duoc.
  echo         Mo file backend\.env, dien VNP_TMN_CODE va VNP_HASH_SECRET
  echo         ^(VNPay gui qua email khi dang ky tai sandbox.vnpayment.vn/devreg^) roi chay lai file nay.
)
if not exist "frontend\.env.local" (
  if exist "frontend\.env.example" (
    copy "frontend\.env.example" "frontend\.env.local" >nul
  ) else (
    > "frontend\.env.local" echo NEXT_PUBLIC_API_URL=http://localhost:3001
  )
)

rem --- 4. Cai thu vien: chi cai khi chua co hoac package.json thay doi ---
call :install backend || goto fail
call :install frontend || goto fail

rem --- 5. Tao bang trong CSDL va nap du lieu mau ---
echo Dang tao bang va nap du lieu mau...
pushd backend
call npx prisma db push --skip-generate
if errorlevel 1 ( popd & goto dbfail )
call npm run seed
if errorlevel 1 ( popd & goto dbfail )
popd

rem --- 6. Mo backend va frontend, moi cai mot cua so rieng ---
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul
if errorlevel 1 (
  start "BrewLite Backend" /d "%~dp0backend" cmd /k npm run start:dev
) else (
  echo Backend da dang chay san, bo qua.
)
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if errorlevel 1 (
  start "BrewLite Frontend" /d "%~dp0frontend" cmd /k npm run dev
) else (
  echo Frontend da dang chay san, bo qua.
)

rem --- 7. Cho backend san sang truoc, roi toi frontend ---
echo Dang cho backend khoi dong, vui long doi...
set "BE_OK="
where curl >nul 2>nul
if errorlevel 1 (
  timeout /t 45 /nobreak >nul
  set BE_OK=1
  goto open
)
set /a TRIES=0
:waitbe
set /a TRIES+=1
if %TRIES% gtr 90 goto waitfe_start
timeout /t 2 /nobreak >nul
curl -s -f -o nul http://localhost:3001/health >nul 2>nul
if errorlevel 1 goto waitbe
set BE_OK=1
echo Backend da san sang.

:waitfe_start
echo Dang cho frontend khoi dong...
set /a TRIES=0
:waitfe
set /a TRIES+=1
if %TRIES% gtr 60 goto open
timeout /t 2 /nobreak >nul
curl -s -o nul http://localhost:3000 >nul 2>nul
if errorlevel 1 goto waitfe

:open
start "" http://localhost:3000
echo.
if not defined BE_OK (
  echo [CANH BAO] Sau 3 phut backend van chua chay. Xem loi trong cua so "BrewLite Backend".
)
echo BrewLite dang chay:  frontend http://localhost:3000   backend http://localhost:3001
echo Tai khoan demo: demo@brewlite.vn / Brewlite123
echo Muon tat: dong 2 cua so "BrewLite Backend" va "BrewLite Frontend".
pause
exit /b 0

rem ===== Cac doan xu ly phu =====
:install
pushd "%~1"
set "NEED="
if not exist "node_modules\" set NEED=1
if not exist "node_modules\.brewlite-pkg" set NEED=1
if not defined NEED (
  fc /b package.json "node_modules\.brewlite-pkg" >nul 2>nul
  if errorlevel 1 set NEED=1
)
if defined NEED (
  echo Dang cai thu vien cho %~1, lan dau co the mat vai phut...
  call npm install --no-audit --no-fund
  if errorlevel 1 ( popd & exit /b 1 )
  copy /y package.json "node_modules\.brewlite-pkg" >nul
)
popd
exit /b 0

:wrongplace
echo [LOI] Khong tim thay thu muc backend va frontend canh file nay.
echo Hay giai nen toan bo file zip roi chay run-brewlite.bat trong thu muc brewlite.
pause
exit /b 1

:dbfail
echo [LOI] Khong tao duoc bang trong PostgreSQL. Kiem tra Docker Desktop dang chay
echo va DATABASE_URL trong backend\.env. Chup man hinh cua so nay gui len de xem.
echo Neu loi nhac toi "data loss" hoac "cannot be executed": CSDL dang la ban cu,
echo hay chay reset-database.bat roi chay lai file nay.
pause
exit /b 1

:fail
echo [LOI] Cai dat that bai. Kiem tra mang Internet roi chay lai.
echo Neu van loi, chup man hinh cua so nay gui len de xem.
pause
exit /b 1
