# 🥦 Fridge Waste Watcher

> **From Waste to Value using AI** — Upload your fridge photo, detect food items, get expiry estimates & recipe suggestions.

## 🗂 Project Structure

```
fridge-waste-watcher/
├── frontend/          # React + Tailwind (deploy to Vercel)
│   ├── src/
│   ├── package.json
│   └── vercel.json
├── backend/           # FastAPI (deploy to Railway)
│   ├── main.py
│   ├── requirements.txt
│   └── Procfile
└── README.md
```

## 🚀 Quick Start

### Backend (FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env     # Fill in your keys
uvicorn main:app --reload --port 8000
```

### Frontend (React)

```bash
cd frontend
npm install
cp .env.example .env     # Set VITE_API_URL
npm run dev
```

## 🔑 Environment Variables

### Backend (`backend/.env`)
| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret key for JWT tokens |
| `MONGO_URI` | MongoDB Atlas connection string |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude vision |

### Frontend (`frontend/.env`)
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend URL (Railway) |

## ☁️ Deployment

### Backend → Railway
1. Push to GitHub
2. Connect Railway to your repo
3. Set root directory to `backend/`
4. Add environment variables
5. Railway auto-detects `Procfile`

### Frontend → Vercel
1. Connect Vercel to your repo
2. Set root directory to `frontend/`
3. Add `VITE_API_URL` env var pointing to Railway URL
4. Deploy

## 🔌 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/signup` | ❌ | Register user |
| POST | `/auth/login` | ❌ | Login user |
| POST | `/upload-image` | ✅ | Analyze fridge image |
| GET | `/history` | ✅ | Get scan history |
| GET | `/stats` | ✅ | Get user statistics |
| GET | `/health` | ❌ | Health check |

## 🧠 AI Features

- **Vision Analysis**: Claude claude-opus-4-5 analyzes fridge images
- **Expiry Estimation**: Realistic shelf-life estimates per item
- **Recipe Suggestions**: Recipes prioritized by near-expiry items
- **Waste Score**: 0-100 freshness score for your fridge
- **Smart Suggestions**: Personalized tips to reduce waste

## 📦 Tech Stack

- **Frontend**: React 18, Tailwind CSS, Recharts, Lucide Icons
- **Backend**: Python FastAPI, Motor (async MongoDB)
- **Database**: MongoDB Atlas
- **AI**: Anthropic Claude claude-opus-4-5 (Vision)
- **Auth**: JWT + bcrypt
- **Deploy**: Vercel + Railway
