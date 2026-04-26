#!/bin/bash
set -e

echo ""
echo "========================================="
echo "  TaxiIQ - Taxi Intelligence System"
echo "========================================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 not found. Install Python 3.10+"
    exit 1
fi

# Check Node
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found. Install from nodejs.org"
    exit 1
fi

echo "[1/4] Setting up Python virtual environment..."
cd backend
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
# Fixed: requirements.txt is in root
pip install -r ../requirements.txt -q

echo "[2/4] Installing frontend dependencies..."
cd ../frontend
npm install --silent

echo "[3/4] Checking for pre-trained models..."
cd ..
if [ ! -f "models_saved/RandomForest.pkl" ]; then
    echo "[WARN] Models not found. Training script missing."
fi

echo "[4/4] Starting servers..."
cd backend
source .venv/bin/activate
# Fixed: main:app instead of app.main:app
uvicorn main:app --reload &
BACKEND_PID=$!
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================="
echo " Backend:  http://localhost:8000"
echo " Docs:     http://localhost:8000/docs"
echo " Frontend: http://localhost:5173"
echo "========================================="
echo ""
echo "Press Ctrl+C to stop all servers"

wait $BACKEND_PID $FRONTEND_PID
