import type { Metadata } from "next";
import { ScanClient } from "@/components/ScanClient";

export const metadata: Metadata = { title: "Scan prescription" };
export const dynamic = "force-dynamic";

export default async function ScanPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const sp = await searchParams;
  return <ScanClient welcome={sp.welcome === "1"} />;
}
