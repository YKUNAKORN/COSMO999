import type { Metadata } from "next";
import { ChartColumnBig } from "lucide-react";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = {
  title: "สถิติ | COSMO999",
};

export default function StatsPage() {
  return (
    <PlaceholderPage
      icon={ChartColumnBig}
      title="สถิติ"
      description="กราฟคะแนนรายรอบ อัตราชนะ และสถิติรายคนของผู้เล่นแต่ละคน"
      phase="5"
    />
  );
}
