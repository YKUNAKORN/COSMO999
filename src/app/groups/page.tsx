import type { Metadata } from "next";
import { Users } from "lucide-react";
import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = {
  title: "ขาประจำ | COSMO999",
};

export default function GroupsPage() {
  return (
    <PlaceholderPage
      icon={Users}
      title="ขาประจำ"
      description="กลุ่มผู้เล่นที่บันทึกไว้ กดครั้งเดียวเริ่มรอบเดิมได้ทันที"
      phase="4"
    />
  );
}
