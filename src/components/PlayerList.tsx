"use client";

// Roster of players with per-row edit and delete. Reads nothing itself -
// the parent owns the usePlayers subscription and passes the list down.
// Writes go straight to src/lib/players; the listener refreshes the list.
import { useRef, useState } from "react";
import { Check, Loader2, Pencil, Trash2, X } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { fileToResizedDataUrl } from "@/lib/image";
import { deletePlayer, updatePlayer } from "@/lib/players";
import type { Player } from "@/types/models";

function PlayerRow({ player }: { player: Player }) {
  const [mode, setMode] = useState<"view" | "edit" | "confirm-delete">("view");
  const [name, setName] = useState(player.name);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function enterEdit() {
    // Seed the buffer here, not from useState: the row never remounts, so a
    // rename from another device would otherwise be reverted on save.
    setName(player.name);
    setFileName(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
    setMode("edit");
  }

  function resetToView() {
    setMode("view");
    setName(player.name);
    setFileName(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed || pending) {
      if (!trimmed) setError("ชื่อห้ามว่าง");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const file = fileRef.current?.files?.[0];
      const image = file ? await fileToResizedDataUrl(file) : undefined;
      await updatePlayer(player.id, { name: trimmed, image });
      resetToView();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    setPending(true);
    setError(null);
    try {
      await deletePlayer(player.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
      setPending(false);
      setMode("view");
    }
  }

  const scoreTone =
    player.totalScore > 0
      ? "text-accent"
      : player.totalScore < 0
        ? "text-suit-red"
        : "text-text-muted";

  return (
    <li className="rounded-lg border border-border bg-surface p-4 shadow-card">
      <div className="flex items-center gap-3">
        <PlayerAvatar player={player} />

        {mode === "edit" ? (
          <input
            type="text"
            value={name}
            aria-label="ชื่อผู้เล่น"
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            className="min-w-0 flex-1 rounded-md border border-border bg-bg px-3 py-2 text-base outline-none focus:border-border-strong"
          />
        ) : (
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{player.name}</p>
            <p className={`text-sm tabular-nums ${scoreTone}`}>
              คะแนนรวม {player.totalScore > 0 ? "+" : ""}
              {player.totalScore}
            </p>
          </div>
        )}

        <div className="flex shrink-0 items-center gap-1">
          {mode === "view" ? (
            <>
              <button
                type="button"
                onClick={enterEdit}
                aria-label={`แก้ไข ${player.name}`}
                className="rounded-md p-2 text-text-muted transition-colors hover:bg-surface-raised hover:text-accent"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setMode("confirm-delete")}
                aria-label={`ลบ ${player.name}`}
                className="rounded-md p-2 text-text-muted transition-colors hover:bg-surface-raised hover:text-danger"
              >
                <Trash2 className="size-4" />
              </button>
            </>
          ) : null}

          {mode === "edit" ? (
            <>
              <button
                type="button"
                onClick={handleSave}
                disabled={pending}
                aria-label="บันทึก"
                className="rounded-md p-2 text-accent transition-colors hover:bg-surface-raised disabled:opacity-60"
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
              </button>
              <button
                type="button"
                onClick={resetToView}
                disabled={pending}
                aria-label="ยกเลิก"
                className="rounded-md p-2 text-text-muted transition-colors hover:bg-surface-raised disabled:opacity-60"
              >
                <X className="size-4" />
              </button>
            </>
          ) : null}
        </div>
      </div>

      {mode === "edit" ? (
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="self-start rounded-md border border-border bg-surface-raised px-3 py-1.5 text-accent transition-colors hover:border-border-strong"
          >
            {fileName ?? "เปลี่ยนรูป"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) =>
              setFileName(event.target.files?.[0]?.name ?? null)
            }
          />
        </div>
      ) : null}

      {mode === "confirm-delete" ? (
        <div className="mt-3 flex flex-col gap-3 rounded-md border border-danger-strong bg-bg p-3 text-sm">
          <p>
            ลบ <span className="font-semibold">{player.name}</span> ?
            คะแนนรวมของผู้เล่นคนนี้จะหายไปด้วย
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="flex items-center gap-1.5 rounded-md bg-danger px-3 py-1.5 font-semibold text-on-danger transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              ลบเลย
            </button>
            <button
              type="button"
              onClick={resetToView}
              disabled={pending}
              className="rounded-md border border-border px-3 py-1.5 transition-colors hover:bg-surface-raised disabled:opacity-60"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </li>
  );
}

export function PlayerList({
  players,
  loading,
}: {
  players: Player[];
  loading: boolean;
}) {
  if (loading) {
    return <p className="text-sm text-text-muted">กำลังโหลดรายชื่อผู้เล่น...</p>;
  }

  if (players.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
        ยังไม่มีผู้เล่น เพิ่มคนแรกได้จากแบบฟอร์มด้านบน
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {players.map((player) => (
        <PlayerRow key={player.id} player={player} />
      ))}
    </ul>
  );
}
