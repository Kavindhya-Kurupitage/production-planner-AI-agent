<div align="center">

```
██████╗ ██████╗  ██████╗ ██████╗ ██╗ ██████╗
██╔══██╗██╔══██╗██╔═══██╗██╔══██╗██║██╔═══██╗
██████╔╝██████╔╝██║   ██║██║  ██║██║██║   ██║
██╔═══╝ ██╔══██╗██║   ██║██║  ██║██║██║▄▄ ██║
██║     ██║  ██║╚██████╔╝██████╔╝██║╚██████╔╝
╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝ ╚══▀▀═╝
```

### **Production Intelligence. Engineered for Operations Teams.**

[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://hub.docker.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-Frontend-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![MIT License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

> *A tool-driven AI agent that simulates production scenarios, surfaces bottlenecks, and generates actionable plans — then objectively benchmarks itself against a plain LLM baseline.*

[▶ Watch Demo](https://www.loom.com/share/dba6b4b722a84944b26d8c48b4530014) · [📖 API Docs](#api-documentation) · [🚀 Quick Start](#one-command-docker-setup)

</div>

---

## ✦ What is ProdIQ?

ProdIQ is an **AI operations copilot** built for production teams who need more than generic LLM answers — they need answers grounded in *their data*, *their constraints*, and *their numbers*.

Upload your production CSV. Ask a scenario question. Get a simulation, bottleneck analysis, action plan, and a scored comparison between your agent and a bare LLM — all in one workflow.

---

## ✦ Core Questions ProdIQ Answers

| Question | What ProdIQ Does |
|---|---|
| *"What breaks first if demand spikes 20%?"* | Simulates capacity vs. demand across all products |
| *"Which SKUs are heading for stockout?"* | Detects bottlenecks using stock, lead time & throughput |
| *"What should my team execute this week?"* | Generates a prioritized, day-by-day action timeline |
| *"Is our AI agent actually better than ChatGPT here?"* | Runs a 5-layer objective benchmark comparison |

---

## ✦ How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ProdIQ Workflow                             │
│                                                                     │
│   1. UPLOAD        2. ASK              3. AGENT RUNS                │
│   ──────────       ──────────          ──────────────               │
│   CSV with         Scenario            simulate_demand()            │
│   capacity,    ──► question        ──► detect_bottlenecks()         │
│   demand,          in plain            generate_action_plan()       │
│   stock,           English                    │                     │
│   lead time                                   ▼                     │
│                                      4. YOU SEE                     │
│                                      ──────────                     │
│                                      • Simulation tables            │
│                                      • Bottleneck cards             │
│                                      • Action timeline              │
│                                      • Narrative summary            │
│                                      • PDF export                   │
│                                      • Benchmark scores             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ✦ One-Command Docker Setup

> ⚡ Entire stack — frontend, backend, database — starts in one command.

### Step 1 — Configure environment

```bash
cp .env.example .env
```

Open `.env` and set the required values:

```env
GROQ_API_KEY=gsk_...              # or OpenAI / Anthropic key
JWT_SECRET_KEY=your-random-secret
POSTGRES_PASSWORD=your-db-password
```

### Step 2 — Launch

```bash
docker compose up --build
```

### Step 3 — Access

| Service | URL |
|---|---|
| 🖥️ Frontend App | http://localhost:3000 |
| ⚙️ Backend API | http://localhost:8000 |
| 📚 Swagger Docs | http://localhost:8000/docs |
| 🩺 Health Check | http://localhost:8000/health |

### Step 4 — Stop

```bash
docker compose down
```

---

## ✦ Environment Variables Reference

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `GROQ_API_KEY` | ✅ | `gsk_...` | AI inference (also accepts OpenAI/Anthropic keys) |
| `JWT_SECRET_KEY` | ✅ | `long-random-string` | JWT token signing |
| `JWT_ALGORITHM` | ✅ | `HS256` | JWT algorithm |
| `POSTGRES_USER` | ✅ | `postgres` | Database username |
| `POSTGRES_PASSWORD` | ✅ | `postgres` | Database password |
| `POSTGRES_DB` | ✅ | `production_planner` | Database name |
| `DATABASE_URL` | ✅ | `postgresql+psycopg://...` | SQLAlchemy connection string |
| `CORS_ORIGINS` | ✅ | `http://localhost:3000` | Allowed frontend origins |
| `GROQ_MODEL` | ⬜ Optional | `mixtral-8x7b-32768` | Override default Groq model |

---

## ✦ Preparing Your CSV

### Required columns

```
product_name | daily_capacity | current_demand | stock_level | lead_time_days
```

### Example

```csv
product_name,daily_capacity,current_demand,stock_level,lead_time_days
Widget-A,500,420,3000,7
Widget-B,200,195,800,14
Widget-C,1000,880,12000,3
```

### Data quality checklist

- [ ] Product names are consistent (no trailing spaces, no duplicates)
- [ ] All numeric fields contain only numbers (no currency symbols)
- [ ] Lead times are in **days** as whole numbers
- [ ] No empty rows or missing required columns

---

## ✦ Scenario Questions to Try

Copy these directly into the Scenario Runner:

```
What if demand increases by 10% next month?
What if demand increases by 20% next month?
What if demand increases by 50% next month?
What happens if our main supplier is delayed by 2 weeks?
How can we reduce overtime by 15% and still meet demand?
Give me a 7-day prioritized action plan with expected impact.
```

---

## ✦ Benchmark: Agent vs. Plain LLM

One of ProdIQ's most distinctive features. In Benchmark Mode, the same scenario question is answered by:

- **Your Agent** — has your company profile, production data, and full tool chain
- **Default LLM** — a plain prompt with no data context and no tools

### Scoring formula

```
total_score = clamp(sum(layer_scores), min=500, max=9200)
```

### Scoring layers

| Layer | Max Points | What's Measured |
|---|---|---|
| **Data Specificity** | 2500 | How many real numeric values from your data appear in the answer |
| **Bottleneck Accuracy** | 2000 | Precision / recall / F1 vs. mathematically detected ground truth |
| **Action Specificity** | 2000 | Product terms, quantities, timeframes, realistic ops actions, prioritization |
| **Completeness** | 2000 | Question-type checklist coverage (demand / supplier / machine scenarios) |
| **Internal Consistency** | 1500 | Cross-checks narrative, bottlenecks, and timeline alignment |

### Grade thresholds

| Score | Grade |
|---|---|
| ≥ 8500 | 🟢 Excellent |
| ≥ 7000 | 🔵 Good |
| ≥ 5500 | 🟡 Average |
| ≥ 4000 | 🟠 Below Average |
| < 4000 | 🔴 Needs Improvement |

---

## ✦ Architecture & Design Decisions

### Why tool-driven planning over pure text generation?
Deterministic simulation tools (`simulate_demand`, `detect_bottlenecks`, `generate_action_plan`) produce auditable, reproducible outputs. The LLM is used for reasoning and narrative synthesis *on top of* computed facts — not as a replacement for computation.

### Why an objective multi-layer benchmark?
Scoring targets measurable quality: specific numbers, bottleneck correctness, logical consistency. This makes the agent-vs-baseline comparison defensible and repeatable — not a matter of style preference.

### Why FastAPI + React?
- Backend owns data integrity, auth, scoring logic, and agent orchestration
- Frontend focuses purely on visualization, UX workflow, and interactive display

### Why Docker-first?
Reproducible one-command startup. No "works on my machine" issues across team environments.

### Why PostgreSQL?
Persistent storage for companies, production rows, scenarios, and benchmark history — enabling trend analysis and historical comparisons over time.

---

## ✦ API Documentation

FastAPI auto-generates interactive docs at runtime:

| Format | URL |
|---|---|
| Swagger UI | http://localhost:8000/docs |
| OpenAPI JSON | http://localhost:8000/openapi.json |

---

## ✦ Project Structure

```
production-planner-agent/
│
├── backend/
│   ├── app/
│   │   ├── agent/          ← planner, benchmark & tool orchestration
│   │   ├── api/            ← REST endpoints
│   │   ├── core/           ← config, database, security
│   │   ├── models/         ← SQLAlchemy ORM models
│   │   ├── schemas/        ← Pydantic request/response schemas
│   │   └── services/       ← business logic layer
│   ├── alembic/            ← database migrations
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── assets/         ← static assets (logo, icons)
│   │   ├── components/     ← reusable UI components
│   │   ├── hooks/          ← custom React hooks
│   │   ├── pages/          ← route-level page components
│   │   ├── store/          ← state management
│   │   └── types/          ← TypeScript interfaces
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml      ← one-command stack definition
├── .env.example            ← environment variable template
└── README.md
```

---

## ✦ Local Development (Without Docker)

### Backend

```bash
cd backend
python -m venv .venv

# Activate (macOS/Linux)
source .venv/bin/activate

# Activate (Windows PowerShell)
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:3000

---

## ✦ Troubleshooting

| Issue | Resolution |
|---|---|
| Login/Register image not showing | Verify import filename exactly matches the asset name (case-sensitive) |
| Docker healthcheck fails | Run `docker compose ps` to confirm all containers are up |
| Benchmark scores are low | Check CSV data quality and use scenario prompts with specific numbers and timeframes |
| Port already in use | Change ports in `docker-compose.yml` and update `CORS_ORIGINS` in `.env` |

---

## ✦ User Workflow

```
Register / Login
      │
      ▼
Create Company Profile
      │
      ▼
Upload Production CSV
      │
      ▼
Enter Scenario Question ──────────────────┐
      │                                   │
      ▼                                   ▼
  Standard Mode                    Benchmark Mode
  ─────────────                    ───────────────
  Simulation Table                 Your Agent score
  Bottleneck Cards                 vs.
  Action Timeline          Plain LLM score (no data)
  Narrative Summary                │
  PDF Export                       ▼
                             Layer-by-layer
                             comparison report
```

---

## ✦ License

```
MIT License — free to use, modify, and distribute.
```

---

<div align="center">

**Built for production teams who need answers backed by data, not guesses.**

[▶ Watch Demo](https://www.loom.com/share/dba6b4b722a84944b26d8c48b4530014)

</div>
