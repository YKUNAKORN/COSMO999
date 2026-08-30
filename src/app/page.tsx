"use client";

// Player management: create, edit, and delete players. The small badge in
// the header doubles as the live-connection indicator for the roster.
import { Loader2, TriangleAlert, Wifi } from "lucide-react";
import { CreatePlayerForm } from "@/components/CreatePlayerForm";
import { PlayerList } from "@/components/PlayerList";
import { usePlayers } from "@/hooks/usePlayers";

export default function HomePage() {
  const { players, loading, error } = usePlayers();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">จัดการผู้เล่น</h1>
          <p className="text-sm text-text-muted">
            เพิ่ม แก้ไข หรือลบผู้เล่นในวง
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
      </header>

      <CreatePlayerForm />
      <PlayerList players={players} loading={loading} />
    </main>
  );
}
