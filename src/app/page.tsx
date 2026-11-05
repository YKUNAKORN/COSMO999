"use client";

// Play page: set up a round, plus the roster tools for adding, editing, and
// removing players. Ultra-Premium iOS 18 typography and frosted badges.
import { useState } from "react";
import { Loader2, Plus, TriangleAlert, Users, Wifi } from "lucide-react";
import { LatestRoundCard } from "@/components/LatestRoundCard";
import { PlayerList } from "@/components/PlayerList";
import { PlayerModal } from "@/components/PlayerModal";
import { RoundSetup } from "@/components/RoundSetup";
import type { PresetTrigger } from "@/components/RoundSetup";
import { useHistory } from "@/hooks/useHistory";
import { usePlayers } from "@/hooks/usePlayers";
import type { Player } from "@/types/models";

export default function HomePage() {
  const { players, loading, error } = usePlayers();
  const { history, loading: historyLoading } = useHistory();

  const [presetTrigger, setPresetTrigger] = useState<PresetTrigger | null>(null);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  function handlePlayAgain(playerIds: string[]) {
    setPresetTrigger({ ids: playerIds, timestamp: Date.now(), autoStart: true });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* Column 1: Round Setup */}
        <div className="flex flex-col gap-6">
          <div className="reveal">
            <RoundSetup
              players={players}
              history={history}
              loading={loading || historyLoading}
              presetTrigger={presetTrigger}
            />
          </div>
        </div>

        {/* Column 2: Latest Round Summary (top) + Manage Players (below) */}
        <div className="flex flex-col gap-6">
          <LatestRoundCard
            history={history}
            players={players}
            onPlayAgain={handlePlayAgain}
          />

          <section className="reveal flex flex-col gap-4">
            {/* Unified Card Container for Managing & Editing Players */}
            <div className="flex flex-col gap-5 rounded-[20px] border border-black/[0.04] dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 sm:size-10 shrink-0 place-items-center rounded-xl bg-blue-50 dark:bg-blue-500/15 text-[#007AFF] dark:text-[#2E8BFF] shadow-xs">
                    <Users className="size-4.5 sm:size-5" />
                  </span>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-tight text-[#1C1C1E] dark:text-[#F2F2F7]">
                      จัดการผู้เล่น
                    </h2>
                    {error ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-900/40 px-2 py-0.5 text-[11px] font-medium text-[#FF3B30] dark:text-[#FF453A]">
                        <TriangleAlert className="size-3" />
                        หลุดการเชื่อมต่อ
                      </span>
                    ) : loading ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-[#8E8E93] dark:text-[#98989D]">
                        <Loader2 className="size-3 animate-spin text-[#007AFF]" />
                        กำลังโหลด
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50/80 dark:bg-blue-500/15 border border-blue-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-[#007AFF] dark:text-[#2E8BFF]">
                        <Wifi className="size-3" />
                        {players.length} คน
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddPlayerOpen(true)}
                  className="flex min-h-[40px] sm:min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#007AFF] px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-blue-500/20 active:scale-95 hover:bg-[#0062cc] transition-all cursor-pointer"
                >
                  <Plus className="size-4 sm:size-4.5 stroke-[2.5]" />
                  <span>เพิ่มผู้เล่นใหม่</span>
                </button>
              </div>

              <div className="h-px bg-black/[0.05] dark:bg-white/[0.06]" />

              <PlayerList
                players={players}
                loading={loading}
                onOpenAdd={() => setIsAddPlayerOpen(true)}
                onEditPlayer={(player) => setEditingPlayer(player)}
              />
            </div>
          </section>
        </div>
      </div>

      {/* Global Modals: Root level (outside 2-column layout) with full-screen blur backdrop */}
      <PlayerModal
        isOpen={isAddPlayerOpen}
        player={null}
        existingPlayers={players}
        onClose={() => setIsAddPlayerOpen(false)}
      />

      <PlayerModal
        isOpen={Boolean(editingPlayer)}
        player={editingPlayer}
        existingPlayers={players}
        onClose={() => setEditingPlayer(null)}
      />

    </div>
  );
}
