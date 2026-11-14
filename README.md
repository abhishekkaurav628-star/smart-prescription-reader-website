# MediScan — Smart Prescription Reader & Medicine Reminder

Snap a photo of a prescription → OCR reads it → NLP extracts every medicine, strength, timing and duration → a dose
schedule and reminders are created automatically.

## Stack (mapped to the reference architecture)

| Layer    | Reference                                         | In this repo |
|----------|---------------------------------------------------|--------------|
| Mobile   | Flutter / React Native                            | REST API with JWT (cookie **or** `Authorization: Bearer`) — ready for a mobile client; the web UI is fully responsive |
| Web      | React.js, HTML5, Tailwind CSS                     | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Backend  | Python (Flask/FastAPI) or Node.js (Express)       | Node.js REST API via Next.js route handlers (`src/app/api/**`) |
| Database | PostgreSQL / MongoDB; Firebase for notifications  | PostgreSQL + Drizzle ORM (`src/db/schema.ts`); FCM device tokens stored in Postgres |
| AI / ML  | TensorFlow/PyTorch, OpenCV, Tesseract/PaddleOCR, spaCy/Transformers | Tesseract.js OCR (`ScanClient`), OpenCV-style canvas pre-processing (`src/lib/preprocess.ts`), rule-based NLP + fuzzy medicine matching (`src/lib/parser.ts`, `src/lib/medicine-db.ts`) |
| Services | FCM, REST, JWT auth, Google Cloud Vision fallback | `src/lib/fcm.ts` (HTTP v1), `src/lib/auth.ts` (JWT/jose + scrypt), `/api/ocr/vision` |
| DevOps   | Docker, GitHub Actions, AWS / GCP                 | `Dockerfile`, `docker-compose.yml`, `.github/workflows/*` |

## Run locally

```bash
cp .env.example .env          # set DATABASE_URL and JWT_SECRET
npm install
npx drizzle-kit push          # create tables
npm run dev
```

### With Docker

```bash
export JWT_SECRET=$(openssl rand -hex 32)
docker compose up --build     # app on http://localhost:3000
```

## REST API

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` | Account + JWT session |
| GET/PATCH | `/api/auth/me` | Profile & daily-routine times |
| POST | `/api/parse` | OCR text → structured medicines (NLP) |
| GET/POST | `/api/ocr/vision` | Optional Google Cloud Vision OCR |
| GET/POST | `/api/prescriptions`, GET/DELETE `/api/prescriptions/:id` | Prescriptions with their medicines |
| GET/POST | `/api/medicines`, PATCH/DELETE `/api/medicines/:id` | Medicines & reminder times |
| GET/POST | `/api/doses?date=YYYY-MM-DD` | Daily schedule; mark taken / skipped |
| GET | `/api/doses/stats` | Adherence, streak, recent activity |
| GET/POST/DELETE | `/api/devices` | FCM device tokens |
| POST | `/api/cron/reminders` | Sends FCM pushes for due doses (`Bearer $CRON_SECRET`) |
| GET | `/api/health` | Health check |

## Optional integrations

* **Google Cloud Vision** — set `GOOGLE_CLOUD_VISION_API_KEY`; the *Scan* page then offers it as an OCR engine.
* **Firebase Cloud Messaging** — set the `NEXT_PUBLIC_FIREBASE_*` variables (web) and `FIREBASE_SERVICE_ACCOUNT_JSON`
  (server), then enable push in *Settings*. Call `POST /api/cron/reminders` every few minutes (the included
  `reminders.yml` workflow does this every 5 minutes when `APP_URL` and `CRON_SECRET` are configured).

## Deploying

The container image built by CI (`ghcr.io/<owner>/<repo>`) runs anywhere: AWS ECS / App Runner, GCP Cloud Run, or a VM.
Provide `DATABASE_URL`, `JWT_SECRET` and run `npx drizzle-kit push --config drizzle.docker.config.mjs` once against the database.

> MediScan is an assistive tool and not a substitute for professional medical advice. Always verify extracted details.
