# MediScan — VS Code + Localhost Setup Guide (Hinglish)

Yeh step-by-step guide aapke **VS Code** mein project kholne, **PostgreSQL** connect karne, aur **http://localhost:3000** par live server chalane mein madad karegi.

---

## 1. Zaroori Software Install Karein

| Software | Download Link | Check Command |
|---|---|---|
| **Node.js 20/22 LTS** | https://nodejs.org | `node -v` |
| **VS Code** | https://code.visualstudio.com | — |
| **PostgreSQL 16** | https://www.postgresql.org/download/windows/ | `psql --version` |

> **Note:** PostgreSQL install karte waqt username `postgres` aur password `postgres` set karein (ya jo set karein use `.env` mein likh dein).

---

## 2. Project Ko VS Code Mein Kholein

```bash
# 1. Project folder mein jaayein
cd path/to/project

# 2. Terminal kholkar dependencies install karein
npm install
```

VS Code mein recommended extensions install karein:
- **ESLint** (dbaeumer.vscode-eslint)
- **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss)
- **Prettier** (esbenp.prettier-vscode)

---

## 3. Database Setup (PostgreSQL)

### Option A: PostgreSQL locally installed hai

```bash
# Terminal / Command Prompt mein
psql -U postgres -c "CREATE DATABASE app_db;"
```

### Option B: Docker use kar rahe hain

```bash
docker run -d --name mediscan-db -p 5432:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=app_db \
  postgres:16-alpine
```

### `.env` File Banayein

Project root mein `.env` file bana kar yeh content paste karein:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
JWT_SECRET=apna-secret-key-yahan-likhain

# Optional: Anthropic Claude AI (best handwriting reading)
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Free Google Gemini AI
GEMINI_API_KEY=AIza...
```

> `JWT_SECRET` ke liye: `openssl rand -hex 32` (Linux/Mac) ya
> `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` (Windows)

---

## 4. Database Tables Banayein

```bash
npx drizzle-kit push
```

Yeh command `src/db/schema.ts` se saari tables (users, prescriptions, medicines, dose_logs, device_tokens) create kar degi.

---

## 5. Development Server Chalayein 🚀

```bash
npm run dev
```

Phir browser mein kholein:

```
http://localhost:3000
```

---

## 6. Claude AI Key Connect Karein (Handwriting Reading)

1. http://localhost:3000 par jaayein aur **Sign In** karein.
2. **Scan** page par upar right side mein **"Connect AI Key (Claude / Gemini / OpenAI / Groq)"** button click karein.
3. **Anthropic Claude** select karein aur apni key (`sk-ant-...`) paste karke **Save & Connect AI** click karein.
   - Free key yahan se banayein: https://console.anthropic.com/settings/keys
4. Ab apni doctor ki handwritten prescription ki photo upload karke **"Read prescription & get AI analysis"** click karein — Claude usse padhega aur detailed Hinglish mein samjhaayega!

---

## 7. Production Build Test Karna Ho To

```bash
npm run build
npm run start
```

Phir http://localhost:3000 par check karein.

---

## 8. Docker Se Poora Stack Chalayein

```bash
# .env mein JWT_SECRET set karein, phir:
docker compose up --build
```

Yeh PostgreSQL + app dono automatically setup kar dega. App http://localhost:3000 par milegi.

---

## ⚠️ Common Problems & Solutions

| Problem | Solution |
|---|---|
| `DATABASE_URL is required` | `.env` file project root mein nahi hai. Step 3 dekhein. |
| `Connection refused` (PostgreSQL) | PostgreSQL service start karein: `services.msc` → PostgreSQL → Start |
| `Port 3000 already in use` | `npx kill-port 3000` ya `npm run dev -- -p 3001` |
| `JWT_SECRET not set` | `.env` mein `JWT_SECRET=...` add karein |
| Tesseract OCR slow/fail | Pehli baar mein internet chahiye (ya server-side OCR already bundled hai) |
| TypeScript errors | `npm run build` se exact error dekhein aur fix karein |
| Tables missing | `npx drizzle-kit push` dobara chalayein |

---

## 9. Project Structure (Important Files)

```
src/
├── app/
│   ├── page.tsx                    → Landing page
│   ├── login/, register/           → Auth pages
│   └── dashboard/
│       ├── page.tsx                → Today dashboard
│       ├── scan/page.tsx           → Prescription scan + AI analysis
│       ├── prescriptions/          → Saved prescriptions
│       ├── medicines/              → Medicine manager
│       ├── history/                → Adherence tracking
│       └── settings/               → Profile, AI key, notifications
├── components/
│   ├── ScanClient.tsx              → OCR + AI scan flow
│   ├── AiInsightsPanel.tsx         → AI analysis + Doctor Q&A chat
│   ├── TodayBoard.tsx              → Today dose schedule
│   └── ...
├── lib/
│   ├── ai-assistant.ts             → Claude/Gemini/OpenAI/Groq AI engine
│   ├── parser.ts                   → Prescription NLP parser
│   ├── medicine-db.ts              → 100+ medicine knowledge base
│   └── ...
└── db/
    └── schema.ts                   → PostgreSQL Drizzle schema
```

---

## 10. GitHub Par Push Karna Ho To

```bash
git init
git add .
git commit -m "MediScan - Smart Prescription Reader"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/mediscan.git
git push -u origin main
```

> **Important:** `.env` file ko **kabhi** GitHub par push na karein (`.gitignore` mein already protected hai).

---

**Happy Coding! 🚀** Koi issue aaye to `npm run build` ka error message check karein ya VS Code terminal dekhein.
