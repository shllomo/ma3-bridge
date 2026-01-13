@echo off
echo ==================================
echo Starting MA3 Bridge Local Service
echo ==================================
echo.

cd /d "%~dp0"

echo Checking if Node.js is installed...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo Node.js found!
echo.

if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

if not exist "dist" (
    echo Building TypeScript...
    npm run build
    echo.
)

echo Starting bridge service...
echo.
echo Once started:
echo - Keep this window open
echo - Open your Vercel app in a browser
echo - Click "Test on MA3" to test scripts
echo.
echo Press Ctrl+C to stop the service
echo ==================================
echo.

npm start

pause