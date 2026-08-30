"use client";

// TEMPORARY debug view, replaced in Phase 2.
// Exists only to prove the real-time RTDB listeners work end to end:
// it shows live counts for players / groups / history and the connection
// state. No writes, no real UI.
import { Loader2, TriangleAlert, Wifi } from "lucide-react";
import { useGroups } from "@/hooks/useGroups";
import { useHistory } from "@/hooks/useHistory";
import { usePlayers } from "@/hooks/usePlayers";

export default function HomePage() {
  const { players, loading: playersLoading, error: playersError } = usePlayers();
  const { groups, loading: groupsLoading, error: groupsError } = useGroups();
  const { history, loading: historyLoading, error: historyError } = useHistory();

  const connecting = playersLoading || groupsLoading || historyLoading;
  const failed = playersError ?? groupsError ?? historyError;

  const rows = [
    { label: "ผู้เล่น (players)", count: players.length, loading: playersLoading },
    { label: "กลุ่ม (groups)", count: groups.length, loading: groupsLoading },
    { label: "ประวัติ (history)", count: history.length, loading: historyLoading },
  ];

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-16">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">หน้าตรวจสอบการเชื่อมต่อ</h1>
        <p className="text-sm text-text-muted">
          หน้าทดสอบชั่วคราว ใช้ยืนยันว่าตัวอ่านข้อมูลเรียลไทม์ทำงานจริง
        </p>
      </header>

      <div className="flex items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm">
        {failed ? (
          <>
            <TriangleAlert className="size-4 text-danger" />
            <span className="text-danger">เชื่อมต่อฐานข้อมูลไม่สำเร็จ</span>
          </>
        ) : connecting ? (
          <>
            <Loader2 className="size-4 animate-spin text-accent" />
            <span className="text-text-muted">กำลังเชื่อมต่อฐานข้อมูล...</span>
          </>
        ) : (
          <>
            <Wifi className="size-4 text-accent" />
            <span className="text-accent">เชื่อมต่อแล้ว รับข้อมูลสด</span>
          </>
        )}
      </div>

      {failed ? (
        <p className="rounded-md border border-danger-strong bg-surface px-4 py-3 text-sm text-text-muted">
          {failed.message}
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3 shadow-card"
          >
            <span className="text-text-muted">{row.label}</span>
            <span className="text-xl font-semibold tabular-nums text-accent">
              {row.loading ? "-" : row.count}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
