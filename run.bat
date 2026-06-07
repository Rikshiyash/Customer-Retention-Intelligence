@echo off
echo Running ChurnGuard Pipeline...
python generate_data.py
python train_model.py
python explain.py
python recommend.py
start /b uvicorn app:app --reload --port 8000
echo ✅ ChurnGuard backend running at http://localhost:8000
echo Open the 'frontend' folder, run 'npm run dev' to start the React dev server!
