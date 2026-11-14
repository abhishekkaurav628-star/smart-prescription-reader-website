import type { Metadata } from "next";
import { MedicinesClient } from "@/components/MedicinesClient";

export const metadata: Metadata = { title: "Medicines" };
export const dynamic = "force-dynamic";

export default async function MedicinesPage({ searchParams }: { searchParams: Promise<{ add?: string }> }) {
  const sp = await searchParams;
  return <MedicinesClient openAdd={sp.add === "1"} />;
}
