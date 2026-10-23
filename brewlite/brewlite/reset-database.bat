@echo off
setlocal
title BrewLite - lam lai CSDL
cd /d "%~dp0"
echo ===== Xoa du lieu BrewLite, lam lai CSDL tu dau =====
echo Thao tac nay XOA HET tai khoan, don hang, tai khoan ao da tao trong PostgreSQL (Docker).
echo Du lieu mau (menu, tai khoan demo, vi MoMo 300.000d, the 20.000d) se duoc nap lai khi chay run-brewlite.bat.
choice /c YN /m "Ban chac chan muon xoa"
if errorlevel 2 exit /b 0

where docker >nul 2>nul
if errorlevel 1 (
  echo [LOI] May chua cai Docker Desktop.
  pause
  exit /b 1
)
docker compose down -v --remove-orphans
rem Xoa ca kho du lieu cua ban cu (truoc khi them tai khoan ao) neu con
docker volume rm brewlite_pgdata >nul 2>nul
echo.
echo Da xoa xong. Nhap dup run-brewlite.bat de tao lai CSDL va nap du lieu mau.
pause
