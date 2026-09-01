import type { Metadata } from "next";
import { Leaderboard } from "@/components/Leaderboard";

export const metadata: Metadata = {
  title: "อันดับ | COSMO999",
};

export default function LeaderboardPage() {
  return <Leaderboard />;
}
