import type { Metadata } from "next";
import { EncyclopediaView } from "@/features/encyclopedia/encyclopedia-view";

export const metadata: Metadata = { title: "나의 오렌지 도감 | Orange Task Farm" };

export default function EncyclopediaPage() {
  return <EncyclopediaView />;
}
