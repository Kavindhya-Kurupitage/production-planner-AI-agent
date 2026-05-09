# ProdIQ - Production Planner AI Agent
Loom Video Link - https://www.loom.com/share/dba6b4b722a84944b26d8c48b4530014
![ProdIQ Logo](frontend/src/assets/logo.svg)

A practical AI operations copilot for production teams.

ProdIQ helps you answer questions like:
- What breaks first if demand increases?
- Which products are at stockout risk?
- What action plan should we execute this week?

It combines simulation + bottleneck detection + action planning, then benchmarks your tool-driven agent against a plain LLM baseline.

---

## What ProdIQ Does 

1. You upload production data (capacity, demand, stock, lead time).
2. You ask a scenario question (example: `What if demand increases by 20%?`).
3. The backend runs tool-based logic to:
   - simulate demand impact,
   - detect bottlenecks,
   - generate prioritized action timeline.
4. The app shows:
   - simulation tables,
   - bottleneck cards,
   - action plan timeline,
   - narrative summary,
   - optional PDF export.
5. In Benchmark mode, ProdIQ compares:
   - **Your Agent** (tool + business context),
   - **Default LLM** (plain answer, no tools/data context).

---

## One-Command Docker Setup

### 1) Prepare env

```bash
cp .env.example .env
```

Edit `.env` and set at least:
- `GROQ_API_KEY` (user can use OpenAI/ Anthropic API keys as well)
- `JWT_SECRET_KEY` (strong random value)

### 2) Start everything

```bash
docker compose up --build
```

That starts:
- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:8000](http://localhost:8000)
- API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health: [http://localhost:8000/health](http://localhost:8000/health)

### 3) Stop

```bash
docker compose down
```

---

## Environment Variables

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `POSTGRES_USER` | Yes | `postgres` | Postgres username |
| `POSTGRES_PASSWORD` | Yes | `postgres` | Postgres password |
| `POSTGRES_DB` | Yes | `production_planner` | Database name |
| `DATABASE_URL` | Yes | `postgresql+psycopg://postgres:postgres@postgres:5432/production_planner` | SQLAlchemy connection string |
| `GROQ_API_KEY` | Yes (AI features) | `gsk_...` | Groq API key |
| `JWT_SECRET_KEY` | Yes | `long-random-secret` | JWT signing key |
| `JWT_ALGORITHM` | Yes | `HS256` | JWT algorithm |
| `CORS_ORIGINS` | Yes | `http://localhost:3000,http://127.0.0.1:3000` | Allowed frontend origins |
| `GROQ_MODEL` | Optional | `mixtral-8x7b-32768` | Override Groq model |

Source of defaults: `.env.example`

---

## CSV Preparation and Upload

### Required columns

- `product_name`
- `daily_capacity`
- `current_demand`
- `stock_level`
- `lead_time_days`

### Upload flow

1. Login/Register
2. Create company profile
3. Open company setup / scenario flow
4. Upload CSV
5. Run scenario questions

### Data quality tips

- Use consistent product names (no accidental trailing spaces).
- Keep numeric fields strictly numeric.
- Use realistic lead times in days.

---

## Example Scenario Questions

Use these directly in Scenario Runner:

- `What if demand increases by 10% next month?`
- `What if demand increases by 20% next month?`
- `What if demand increases by 50% next month?`
- `What happens if our main supplier is delayed by 2 weeks?`
- `How can we reduce overtime by 15% and still meet demand?`
- `Give me a 7-day prioritized action plan with expected impact.`

---

## Benchmark Methodology (Current System)

Benchmark runs a fixed set of scenario questions through two systems:

- **My Agent**: has company profile + production data + tool chain (`simulate_demand`, `detect_bottlenecks`, `generate_action_plan`)
- **Default LLM**: plain prompt response, no business data context and no tools

### Total Score Formula

```text
total_score = clamp(sum(layer_scores), min=500, max=9200)
```

Where layers are:

1. **Data Specificity** (`0-2500`)
   - Checks how many real numeric values from production data appear in answer text.
2. **Bottleneck Accuracy** (`0-2000`)
   - Compares mentioned product bottlenecks vs mathematically detected ground truth (precision/recall/F1, with penalties).
3. **Action Specificity** (`0-2000`)
   - Heuristic scoring for actionable details (product/entity terms, quantities, timeframes, realistic ops actions, prioritization, vague-language penalties).
4. **Completeness** (`0-2000`)
   - Question-type checklist coverage (demand/supplier/machine styles).
5. **Internal Consistency** (`0-1500`)
   - Cross-checks narrative, bottlenecks, and timeline alignment.

### Grades

- `>= 8500`: Excellent
- `>= 7000`: Good
- `>= 5500`: Average
- `>= 4000`: Below Average
- `< 4000`: Needs Improvement

---

## Architecture Decisions (Why this design)

### 1) Tool-driven planning over pure text generation
- Deterministic simulation/bottleneck/action tools produce auditable outputs.
- LLM is used for reasoning/narrative on top of computed facts.

### 2) Objective multi-layer benchmark
- Scoring focuses on measurable quality (numbers, bottleneck correctness, consistency), not style.
- Makes agent-vs-baseline comparison defensible.

### 3) FastAPI + React split
- Backend owns data, auth, scoring, and agent orchestration.
- Frontend focuses on visualization and workflow UX.

### 4) Docker-first local environment
- Reproducible startup and fewer "works on my machine" issues.

### 5) Postgres persistence
- Stores companies, production rows, scenarios, benchmark results for history and trend analysis.

---

## API Documentation

FastAPI auto-generates docs:

- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- OpenAPI JSON: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

---

## Project Structure

```text
production-planner-agent 1.1/
├── backend/
│   ├── app/
│   │   ├── agent/        # planner + benchmark + tool orchestration
│   │   ├── api/          # REST endpoints
│   │   ├── core/         # config, db, security
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # request/response schemas
│   │   └── services/
│   ├── alembic/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── store/
│   │   └── types/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Local Development (Without Docker)

### Backend

```bash
cd backend
python -m venv .venv
# Windows PowerShell:
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

Frontend default: [http://localhost:3000](http://localhost:3000)

---

## Troubleshooting

- **Login/Register image not showing**: verify import filename exactly matches asset name 
- **Docker healthcheck fails**: confirm containers are up with `docker compose ps`.
- **Benchmark looks low**: ensure CSV data quality and use specific scenario prompts with numbers/timeframes.

---

## License

MIT
