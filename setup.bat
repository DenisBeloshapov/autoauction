@echo off
REM ============================================================================
REM  AutoAuction - Setup Wrapper (cmd)
REM  Launches setup.ps1 via PowerShell, bypassing execution policy.
REM  This file is ASCII-only on purpose - cmd.exe reads .bat files with the
REM  system codepage (cp866 on Russian Windows), which breaks Cyrillic chars
REM  in UTF-8 files. Keep comments in English here.
REM ============================================================================

chcp 65001 >nul 2>&1
cd /d "%~dp0"

echo.
echo ============================================================
echo   AutoAuction - Setup
echo ============================================================
echo.

REM Check that setup.ps1 exists in the same folder
if not exist "setup.ps1" (
    echo [ERR] setup.ps1 not found in the current folder.
    echo       Run setup.bat from the project root directory.
    pause
    exit /b 1
)

REM Launch PowerShell with -ExecutionPolicy Bypass so the script can run
REM even if the user's policy would normally block unsigned scripts.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERR] Setup script exited with error code %ERRORLEVEL%.
    pause
    exit /b %ERRORLEVEL%
)

echo.
pause
