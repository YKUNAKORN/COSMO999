import type { Metadata } from "next";
import { Stats } from "@/components/Stats";

export const metadata: Metadata = {
  title: "สถิติ | COSMO999",
};

export default function StatsPage() {
  return <Stats />;
}
