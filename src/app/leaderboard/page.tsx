import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = {
  title: "อันดับ | COSMO999",
};

export default function LeaderboardPage() {
  return (
    <PlaceholderPage
      icon={Trophy}
      title="อันดับ"
      description="ตารางคะแนนสะสมของทุกคนในวง เรียงจากมากไปหาน้อย"
      phase="3"
    />
  );
}
