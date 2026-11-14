import type { Metadata } from "next";
import { TodayBoard } from "@/components/TodayBoard";

export const metadata: Metadata = { title: "Today" };

export default function DashboardPage() {
  return <TodayBoard />;
}
