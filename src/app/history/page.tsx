import type { Metadata } from "next";
import { History } from "@/components/History";

export const metadata: Metadata = {
  title: "ประวัติ | COSMO999",
};

export default function HistoryPage() {
  return <History />;
}
