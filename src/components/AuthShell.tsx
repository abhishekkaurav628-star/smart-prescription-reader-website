import type { ReactNode } from "react";
import { BellRing, ScanLine, ShieldCheck } from "lucide-react";
import { Logo } from "./Logo";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-navy-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-navy-500/40 blur-3xl" />
        <Logo light />
        <div className="relative max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight">Never miss a dose. Never decode handwriting again.</h2>
          <ul className="mt-10 space-y-6 text-navy-100">
            {[
              { icon: ScanLine, title: "Scan once", text: "OCR reads your prescription photo and extracts every medicine." },
              { icon: BellRing, title: "Get reminded", text: "Doses are scheduled automatically around your daily routine." },
              { icon: ShieldCheck, title: "Stay in control", text: "Review and edit everything before it is saved." },
            ].map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-teal-300">
                  <Icon size={20} />
                </span>
                <span>
                  <span className="block font-bold text-white">{title}</span>
                  <span className="text-sm leading-relaxed">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-navy-300">MediScan is an assistive tool and not a substitute for professional medical advice.</p>
      </aside>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-slide-up">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{title}</h1>
          <p className="mb-8 mt-2 text-slate-600">{subtitle}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
