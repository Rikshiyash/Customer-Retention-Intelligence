#!/bin/bash
python.exe generate_data.py
python.exe train_model.py
python.exe explain.py
python.exe recommend.py
python.exe -m uvicorn app:app --reload --port 8000 &
echo "✅ ChurnGuard backend running at http://localhost:8000"
echo "Open dashboard.jsx in your React dev server"
