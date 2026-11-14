import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MediScan — Smart Prescription Reader & Medicine Reminder",
    template: "%s · MediScan",
  },
  description:
    "Snap a photo of your prescription. MediScan reads it with OCR + NLP, builds your medicine schedule and reminds you to take every dose.",
};

export const viewport: Viewport = {
  themeColor: "#1f2a63",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
