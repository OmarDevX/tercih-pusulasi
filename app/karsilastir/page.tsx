import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DEFAULT_COMPARE_PATH } from "../routes";

export const metadata: Metadata = {
  title: "Üniversite Karşılaştırma: Alan Sıralamaları, URAP, THE ve QS",
  description:
    "İki veya üç üniversiteyi URAP, THE, QS, THE 2026 alan sıralamaları, yayın, atıf, H-indeksi ve akademik ivme verileriyle yan yana karşılaştırın.",
  alternates: { canonical: "/karsilastir" },
  openGraph: {
    title: "Üniversite Karşılaştırma | Tercih Pusulası",
    description: "Üniversiteleri genel sıralamalar, alan sıralamaları ve araştırma verileriyle karşılaştırın.",
    url: "/karsilastir",
  },
};

export default function ComparePage() {
  redirect(DEFAULT_COMPARE_PATH);
}
