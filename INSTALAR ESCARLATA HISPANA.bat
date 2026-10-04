@echo off
setlocal
cd /d "%~dp0"
title Instalar Escarlata Hispana
set "CI=true"
set "CSC_IDENTITY_AUTO_DISCOVERY=false"
cls
echo ================================================
echo             ESCARLATA HISPANA
echo ================================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Para preparar esta copia se necesita Node.js.
  echo Instala Node.js y vuelve a ejecutar este archivo.
  timeout /t 8 /nobreak >nul
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm no esta disponible.
  timeout /t 8 /nobreak >nul
  exit /b 1
)
echo Preparando Escarlata Hispana...
call npm install <nul
if errorlevel 1 goto :error
echo.
echo Compilando automaticamente. No es necesario presionar ninguna tecla...
call npm run dist <nul
if errorlevel 1 goto :error
set "SETUP="
for /f "delims=" %%F in ('dir /b /a-d /o-d "dist\Instalador-Escarlata-Hispana-*.exe" 2^>nul') do if not defined SETUP set "SETUP=%%F"
if not defined SETUP goto :error
cls
echo Instalador creado correctamente.
echo Se abrira automaticamente Escarlata Hispana.
echo.
start /wait "" "dist\%SETUP%"
exit /b 0
:error
echo.
echo ERROR: No se pudo preparar o instalar Escarlata Hispana.
echo Esta ventana se cerrara automaticamente.
timeout /t 12 /nobreak >nul
exit /b 1
