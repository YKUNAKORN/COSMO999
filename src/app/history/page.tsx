import type { Metadata } from "next";
import { History } from "lucide-react";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = {
  title: "ประวัติ | COSMO999",
};

export default function HistoryPage() {
  return (
    <PlaceholderPage
      icon={History}
      title="ประวัติ และ Undo"
      description="รายการรอบที่เล่นไปแล้ว พร้อมปุ่มยกเลิกผลของรอบล่าสุด"
      phase="3"
    />
  );
}
