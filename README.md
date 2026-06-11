# 🌟 ChurnGuard — Customer Retention Intelligence

![Churn Dashboard](https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=80)

> A beautiful analytics dashboard for telecom churn prediction, customer retention campaigns, and model-driven action planning.

<br />

![Python](https://img.shields.io/badge/Python-3.11-blue?style=for-the-badge&logo=python)
![React](https://img.shields.io/badge/React-18.3.1-blue?style=for-the-badge&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-Enabled-brightgreen?style=for-the-badge&logo=fastapi)
![XGBoost](https://img.shields.io/badge/XGBoost-Powered-orange?style=for-the-badge&logo=xgboost)

---

## 🚀 What is ChurnGuard?

ChurnGuard is a customer retention intelligence app built to help product and operations teams visualize subscriber churn risk, manage retention campaigns, and recommend focused actions for high-risk customers.

It combines:

- A **FastAPI backend** for subscriber analytics and model inference
- A **React + Vite dashboard** with charts, regional maps, and campaign tools
- A **pre-trained churn model** and sample subscriber dataset
- Automated recommendations for outreach, incentives, and win-back strategies

---

## ✨ Key Features

- **Risk tier segmentation** for churn-prone customers
- **Interactive subscriber search & filters** by region, package, and risk
- **Live campaign preview** with conversion and retention planning
- **Map-based regional analytics** using Leaflet
- **Forecast & impact simulation** for retention decisions
- **Add subscriber demo** with immediate churn prediction
- **Bulk upload support** for new subscriber datasets
- **Model metrics + explainability** baked into the dashboard

---

## 🧩 Tech Stack

- Backend: `FastAPI`, `uvicorn`, `pandas`, `numpy`, `xgboost`, `joblib`
- Frontend: `React`, `Vite`, `Tailwind`, `Recharts`, `Leaflet`, `React-Leaflet`
- Data: `subscribers.csv`, `subscribers_final.csv`
- Model: `churn_model.pkl`, `encoders.pkl`

---

## 💻 Setup Instructions

### 1. Backend

```bash
cd C:\Users\Arun Panchal\Downloads\ChurnPredictor
python -m pip install -r requirements.txt
```

> Optional: create a virtual environment before installing dependencies.

### 2. Frontend

```bash
cd frontend
npm install
```

### 3. Run the full app

Open two terminals:

Terminal 1 (API):

```bash
cd C:\Users\Arun Panchal\Downloads\ChurnPredictor
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Terminal 2 (Dashboard):

```bash
cd C:\Users\Arun Panchal\Downloads\ChurnPredictor\frontend
npm run dev
```

Then visit the local Vite URL displayed in the terminal, such as `http://localhost:5173`.

---

## 📁 Project Structure

- `app.py` — FastAPI backend and API endpoints
- `frontend/src` — dashboard components and UI logic
- `subscribers_final.csv` — enriched subscriber dataset
- `churn_model.pkl` — trained churn prediction model
- `encoders.pkl` — categorical encoders for model inputs
- `train_model.py` — training pipeline for churn modeling
- `generate_data.py` — synthetic subscriber data generation

---

## 🔧 Local Development Tips

- Use `run.bat` or `run.sh` if available for quick startup
- Update `campaigns.json` to add or tune campaign strategies
- Add new subscribers by using the dashboard form or the `/api/add-subscriber` endpoint
- Monitor API responses from `app.py` and verify data in `subscribers_final.csv`

---

## 🎯 How to Use

1. Start the backend and frontend
2. Open the dashboard in your browser
3. Filter subscribers by region, package, and risk tier
4. Explore recommendations and campaign impact
5. Add or upload new subscriber data to test predictions

---

## 🌈 Why it stands out

ChurnGuard is designed for clarity and action:

- Visual dashboards make churn patterns easy to spot
- Retention actions are automatically suggested based on subscriber behavior
- Upload workflows and simulation tools help teams test real-world scenarios

---

## 📌 Notes

- If you want to enable the Gemini API features in `app.py`, set `GEMINI_API_KEY` in a `.env` file.
- Make sure `subscribers_final.csv` is present before starting the API.

---

## ❤️ Contribute

Feel free to enhance the dashboard by:

- adding new charts and analytics
- improving campaign automation
- connecting real business CRM data
- integrating more advanced explainability and retention rules

---

![Retention Growth](https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80)

> Make churn prediction beautiful, actionable, and business-ready.
