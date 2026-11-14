import type { Metadata } from "next";
import { PrescriptionDetailClient } from "@/components/PrescriptionDetailClient";

export const metadata: Metadata = { title: "Prescription" };
export const dynamic = "force-dynamic";

export default async function PrescriptionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PrescriptionDetailClient id={id} />;
}
