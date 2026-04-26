@echo off
echo.
echo =========================================
echo   TaxiIQ - Taxi Intelligence System
echo =========================================
echo.

REM Check Python
python --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo ERROR: Python not found. Install Python 3.10+ from python.org
    pause
    exit /b
)

REM Check Node
node --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo ERROR: Node.js not found. Install from nodejs.org
    pause
    exit /b
)

echo [1/4] Setting up Python virtual environment...
cd backend
IF NOT EXIST .venv (
    python -m venv .venv
)
call .venv\Scripts\activate
REM Changed requirements path to root
pip install -r ..\requirements.txt --quiet

echo [2/4] Installing frontend dependencies...
cd ..\frontend
call npm install --silent

echo [3/4] Checking for pre-trained models...
cd ..
IF NOT EXIST models_saved\RandomForest.pkl (
    echo [WARN] Models not found in models_saved/. Please run your training script if available.
) ELSE (
    echo [OK] Models found.
)

echo [4/4] Starting servers...
REM Fixed uvicorn command: removed 'app.' since main.py is in backend root
start "TaxiIQ Backend" cmd /k "cd backend && ..\.venv\Scripts\activate && uvicorn main:app --reload"
timeout /t 3
start "TaxiIQ Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo =========================================
echo  Backend:  http://localhost:8000
echo  Docs:     http://localhost:8000/docs
echo  Frontend: http://localhost:5173
echo =========================================
pause
