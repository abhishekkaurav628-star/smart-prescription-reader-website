import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  Brain,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Languages,
  Lock,
  ScanLine,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { HeaderAuthButtons, HeroCtaButtons } from "@/components/LandingActions";
import { Logo } from "@/components/Logo";

const steps = [
  { icon: Camera, title: "Snap", text: "Take a photo of your prescription or upload an existing image." },
  { icon: ScanLine, title: "Read", text: "Image clean-up and OCR turn handwriting & print into text." },
  { icon: Brain, title: "Understand", text: "NLP picks out medicine names, strengths, timings and duration." },
  { icon: BellRing, title: "Remind", text: "A dose schedule is built and reminders fire at the right time." },
];

const features = [
  { icon: ScanLine, title: "Smart prescription reader", text: "OCR with adaptive image enhancement, plus an optional Google Cloud Vision fallback for tough handwriting." },
  { icon: Languages, title: "Understands doctor shorthand", text: "OD, BD, TDS, HS, SOS, 1-0-1, “after food”, “x 5 days” — all decoded and converted to real times." },
  { icon: Sparkles, title: "OCR error correction", text: "Fuzzy matching against a medicine knowledge base fixes misread names like “Amlodipne” automatically." },
  { icon: BellRing, title: "Reminders that reach you", text: "In-app alerts, browser notifications and Firebase Cloud Messaging push for when the tab is closed." },
  { icon: BarChart3, title: "Adherence tracking", text: "Mark doses taken or skipped, watch your streak and see how consistent you've been this week." },
  { icon: ClipboardCheck, title: "You stay in control", text: "Every detected medicine is editable before saving. Nothing is scheduled without your review." },
];

const stack = [
  {
    layer: "Mobile",
    tech: "Flutter / React Native",
    use: "Mobile-ready REST + JWT Bearer API. The web app is fully responsive and installs-like on phones.",
    status: "API ready",
  },
  {
    layer: "Web",
    tech: "React.js, HTML5, Tailwind CSS",
    use: "Next.js 16 (App Router) with React 19, semantic HTML5 and Tailwind CSS 4.",
    status: "Built",
  },
  {
    layer: "Backend",
    tech: "Python (Flask / FastAPI) or Node.js (Express)",
    use: "Node.js REST API served through Next.js route handlers — auth, prescriptions, medicines, doses, devices.",
    status: "Built",
  },
  {
    layer: "Database",
    tech: "PostgreSQL / MongoDB; Firebase for notifications",
    use: "PostgreSQL through Drizzle ORM. Firebase handles push delivery; device tokens live in Postgres.",
    status: "Built",
  },
  {
    layer: "AI / ML",
    tech: "TensorFlow / PyTorch, OpenCV, Tesseract / PaddleOCR, spaCy / Transformers",
    use: "Tesseract OCR (WASM), OpenCV-style adaptive thresholding on canvas, and an NLP entity extractor with fuzzy matching.",
    status: "Built",
  },
  {
    layer: "Services",
    tech: "Firebase Cloud Messaging, REST, JWT auth, Google Cloud Vision (optional OCR fallback)",
    use: "JWT sessions (httpOnly cookie or Bearer), FCM HTTP v1 sender, and a Vision OCR proxy that activates with an API key.",
    status: "Built",
  },
  {
    layer: "DevOps",
    tech: "Docker, GitHub Actions, AWS / GCP",
    use: "Multi-stage Dockerfile, docker-compose with Postgres, and a CI workflow. Deploy to AWS ECS/App Runner or Cloud Run.",
    status: "Included",
  },
];

export default function LandingPage() {
  return (
    <div className="overflow-x-clip">
      <header className="sticky top-0 z-30 border-b border-navy-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
            <a href="#how" className="hover:text-navy-900">How it works</a>
            <a href="#features" className="hover:text-navy-900">Features</a>
            <a href="#stack" className="hover:text-navy-900">Tech stack</a>
          </nav>
          <HeaderAuthButtons />
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] bg-gradient-to-b from-navy-100/80 via-navy-50 to-transparent" />
        <div className="pointer-events-none absolute -right-32 top-10 -z-10 h-80 w-80 rounded-full bg-teal-300/25 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-14 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
          <div className="animate-slide-up">
            <span className="badge border border-teal-200 bg-teal-50 text-teal-800">
              <Sparkles size={14} /> OCR + NLP + smart reminders
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-navy-900 sm:text-5xl lg:text-6xl">
              Scan your prescription. <span className="text-teal-600">Never miss a dose.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              MediScan reads your doctor&apos;s prescription from a photo, understands the medicines, strengths and timings, and
              sets up reminders for every single dose — automatically.
            </p>
            <HeroCtaButtons />
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-slate-600">
              {["Works with photos & PDFs-as-images", "Edit before you save", "Private by design"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-teal-600" /> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Product mock */}
          <div className="relative mx-auto w-full max-w-md animate-fade-in lg:max-w-none">
            <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
              <div className="-rotate-2 rounded-2xl border border-amber-100 bg-[#fffdf5] p-5 shadow-xl shadow-navy-900/10">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Dr. A. Sharma · Clinic</p>
                <p className="mt-1 font-serif text-2xl italic text-navy-800">Rx</p>
                <div className="mt-2 space-y-2.5 font-mono text-[12.5px] leading-snug text-slate-700">
                  <p>1. Tab. Dolo 650 mg<br /><span className="text-slate-500">1-1-1 × 5 days (AF)</span></p>
                  <p>2. Cap. Pantoprazole 40<br /><span className="text-slate-500">1-0-0 × 10 d, empty stomach</span></p>
                  <p>3. Tab. Cetirizine 10 mg<br /><span className="text-slate-500">0-0-1 × 5 days</span></p>
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-navy-900/5 px-2.5 py-1.5 text-[11px] font-semibold text-navy-700">
                  <ScanLine size={14} /> Scanning…
                </div>
              </div>

              <div className="hidden justify-self-center text-teal-600 sm:block">
                <ArrowRight size={28} />
              </div>

              <div className="rotate-1 rounded-2xl border border-navy-100 bg-white p-4 shadow-xl shadow-navy-900/10">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-extrabold text-navy-900">Today</p>
                  <span className="badge bg-teal-50 text-teal-800">2 of 5 taken</span>
                </div>
                <div className="space-y-2">
                  {[
                    { t: "8:00 AM", n: "Dolo 650", d: "After food", done: true },
                    { t: "8:00 AM", n: "Pantoprazole", d: "Empty stomach", done: true },
                    { t: "1:30 PM", n: "Dolo 650", d: "After food", done: false },
                    { t: "8:30 PM", n: "Cetirizine", d: "10 mg", done: false },
                  ].map((d, i) => (
                    <div key={i} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${d.done ? "border-teal-100 bg-teal-50/70" : "border-navy-100 bg-navy-50/50"}`}>
                      <span className={`grid h-6 w-6 place-items-center rounded-full ${d.done ? "bg-teal-600 text-white" : "border-2 border-navy-200 bg-white"}`}>
                        {d.done && <CheckCircle2 size={14} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold text-navy-900">{d.n}</p>
                        <p className="text-[11px] text-slate-500">{d.d}</p>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500">{d.t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-navy-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
              <BellRing size={14} className="text-teal-300" /> Reminder: Dolo 650 — time to take your dose
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 bg-white py-20">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-sm font-bold uppercase tracking-widest text-teal-700">How it works</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">From a crumpled paper to a clear schedule in four steps</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="relative rounded-2xl border border-navy-100 bg-navy-50/60 p-6">
                <span className="absolute right-5 top-4 text-5xl font-extrabold text-navy-100">{i + 1}</span>
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-navy-900 text-teal-300">
                  <Icon size={22} />
                </span>
                <h3 className="mt-5 text-lg font-extrabold text-navy-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-sm font-bold uppercase tracking-widest text-teal-700">Features</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">Built for real prescriptions, real routines</h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <article key={title} className="card p-6 transition hover:-translate-y-1 hover:shadow-lg">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-teal-700">
                  <Icon size={22} />
                </span>
                <h3 className="mt-4 text-lg font-extrabold text-navy-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Tech stack */}
      <section id="stack" className="scroll-mt-20 bg-navy-900 py-20 text-white">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-sm font-bold uppercase tracking-widest text-teal-300">Architecture</p>
          <h2 className="mt-2 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl">The technology stack behind MediScan</h2>
          <p className="mt-3 max-w-2xl text-navy-200">Every layer of the reference stack is covered — here is how each one is used in this build.</p>

          <div className="mt-10 overflow-hidden rounded-2xl border border-navy-700 bg-white text-slate-800 shadow-2xl">
            <div className="hidden grid-cols-[130px_1.1fr_1.4fr_110px] bg-navy-950 px-5 py-3.5 text-sm font-bold text-white md:grid">
              <span>Layer</span>
              <span>Technologies</span>
              <span>How MediScan uses it</span>
              <span>Status</span>
            </div>
            {stack.map((row, i) => (
              <div
                key={row.layer}
                className={`grid gap-1 border-t border-navy-100 px-5 py-4 first:border-t-0 md:grid-cols-[130px_1.1fr_1.4fr_110px] md:items-center md:gap-4 ${i % 2 ? "bg-navy-50" : "bg-white"}`}
              >
                <span className="font-extrabold text-navy-900">{row.layer}</span>
                <span className="text-sm text-slate-700">{row.tech}</span>
                <span className="text-sm text-slate-600">{row.use}</span>
                <span>
                  <span className="badge bg-teal-100 text-teal-800">{row.status}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 text-sm text-navy-100 sm:grid-cols-3">
            {[
              { icon: Lock, text: "Passwords hashed with scrypt; sessions use signed JWTs." },
              { icon: Smartphone, text: "Same REST API can power a Flutter or React Native client." },
              { icon: FileText, text: "Photos are not stored by MediScan; external AI providers receive images only when you connect them." },
            ].map(({ icon: Icon, text }) => (
              <p key={text} className="flex items-start gap-3 rounded-xl bg-white/5 p-4">
                <Icon size={18} className="mt-0.5 shrink-0 text-teal-300" /> {text}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">Ready to take the guesswork out of your medicines?</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">Create a free account and scan your first prescription in under a minute.</p>
          <Link href="/register" className="btn-accent mt-8 px-7 py-3.5 text-base">
            Get started free <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-navy-100 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-center text-xs text-slate-500 sm:flex-row sm:text-left">
          <Logo />
          <p className="max-w-xl">
            MediScan is an assistive tool and does not provide medical advice. Always verify extracted details with your doctor or pharmacist.
          </p>
        </div>
      </footer>
    </div>
  );
}
