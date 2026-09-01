import type { Metadata } from "next";
import { Groups } from "@/components/Groups";

export const metadata: Metadata = {
  title: "ขาประจำ | COSMO999",
};

export default function GroupsPage() {
  return <Groups />;
}
