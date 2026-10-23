@echo off
title BrewLite - Docker Compose
cd /d "%~dp0"
echo Chay toan bo BrewLite bang Docker (PostgreSQL + backend + frontend).
echo Lan dau build mat vai phut. Xong mo http://localhost:3000
echo Tat: bam Ctrl+C trong cua so nay, roi chay: docker compose down
docker compose up --build
pause
