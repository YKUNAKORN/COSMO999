"use client";

// Play page: set up a round, plus the roster tools for adding, editing, and
// removing players. The brand bar lives in the app shell; this file renders
// only the page content. The badge is the live connection indicator for the
// roster read.
import { useState } from "react";
import { Loader2, TriangleAlert, Wifi } from "lucide-react";
import { CreatePlayerForm } from "@/components/CreatePlayerForm";
import { LatestRoundCard } from "@/components/LatestRoundCard";
import { PlayerList } from "@/components/PlayerList";
import { RoundSetup } from "@/components/RoundSetup";
import type { PresetTrigger } from "@/components/RoundSetup";
import { useHistory } from "@/hooks/useHistory";
import { usePlayers } from "@/hooks/usePlayers";

export default function HomePage() {
  const { players, loading, error } = usePlayers();
  const { history, loading: historyLoading } = useHistory();
  const [presetTrigger, setPresetTrigger] = useState<PresetTrigger | null>(null);

  function handlePlayAgain(playerIds: string[]) {
    setPresetTrigger({ ids: playerIds, timestamp: Date.now() });
    const el = document.getElementById("round-setup-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="reveal flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            ตั้งค่ารอบ
          </h1>
          <p className="text-sm text-text-muted">
            เลือกผู้เล่นกับตัวคูณ แล้วไปกรอกคะแนน
          </p>
        </div>

        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs">
          {error ? (
            <>
              <TriangleAlert className="size-3.5 text-danger" />
              <span className="text-danger">หลุดการเชื่อมต่อ</span>
            </>
          ) : loading ? (
            <>
              <Loader2 className="size-3.5 animate-spin text-accent" />
              <span className="text-text-muted">กำลังเชื่อมต่อ</span>
            </>
          ) : (
            <>
              <Wifi className="size-3.5 text-accent" />
              <span className="text-accent">{players.length} คน</span>
            </>
          )}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-6">
          <div className="reveal">
            <RoundSetup
              players={players}
              history={history}
              loading={loading || historyLoading}
              presetTrigger={presetTrigger}
            />
          </div>

          <LatestRoundCard
            history={history}
            players={players}
            onPlayAgain={handlePlayAgain}
          />
        </div>

        <section className="reveal flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">จัดการผู้เล่น</h2>
            <p className="text-sm text-text-muted">
              เพิ่ม แก้ไข หรือลบผู้เล่นในวง
            </p>
          </div>

          <CreatePlayerForm />
          <PlayerList players={players} loading={loading} />
        </section>
      </div>
    </div>
  );
}
