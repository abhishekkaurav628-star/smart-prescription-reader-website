import type { Metadata } from "next";
import { PrescriptionsClient } from "@/components/PrescriptionsClient";

export const metadata: Metadata = { title: "Prescriptions" };

export default function PrescriptionsPage() {
  return <PrescriptionsClient />;
}
