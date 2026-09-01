"use client";

// Groups page client component. Ported from legacy renderGroups (L1451),
// playThisGroup (L682), showGroupScore (L1484), and editGroup (L1530).
// Replaced prompt()/confirm() with accessible dialogs. Preset player
// selection is passed to RoundSetup via ?preset=id1,id2 URL param.
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Loader2,
  Pencil,
  Play,
  TriangleAlert,
  Users,
} from "lucide-react";
import { EditGroupDialog } from "@/components/EditGroupDialog";
import { GroupScoreDialog } from "@/components/GroupScoreDialog";
import { useGroups } from "@/hooks/useGroups";
import { usePlayers } from "@/hooks/usePlayers";
import { deleteGroup, renameGroup } from "@/lib/groups";
import type { Group, Player } from "@/types/models";

// Build a human-readable member list from playerIds. Players not in the
// current roster are shown as "(ถูกลบ)" - matching legacy escapeHTML(p.name)
// fallback logic (L1461-1464).
function memberLabel(playerIds: string[], players: Player[]): string {
  return playerIds
    .map((id) => {
      const p = players.find((x) => x.id === id);
      return p ? p.name : "(ถูกลบ)";
    })
    .join(" • ");
}

// Single group card.
function GroupCard({
  group,
  players,
  onPlay,
  onScore,
  onEdit,
}: {
  group: Group;
  players: Player[];
  // Returns an error string if the preset cannot be started, null on success.
  onPlay: (group: Group) => string | null;
  onScore: (groupId: string) => void;
  onEdit: (groupId: string) => void;
}) {
  // Per-card play error; cleared on next attempt.
  const [playError, setPlayError] = useState<string | null>(null);

  function handlePlay() {
    const err = onPlay(group);
    setPlayError(err);
  }

  return (
    <article className="reveal flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-card">
      {/* Group name + member list */}
      <div className="flex items-start gap-3">
        <Users className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">{group.name}</h2>
          <p className="mt-0.5 text-xs text-text-muted">
            {memberLabel(group.playerIds, players)}
          </p>
        </div>
      </div>

      {/* Play error */}
      {playError ? (
        <p role="alert" className="text-xs text-danger">
          {playError}
        </p>
      ) : null}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {/* Primary: play */}
        <button
          type="button"
          onClick={handlePlay}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 font-semibold text-on-accent transition-opacity hover:opacity-90"
        >
          <Play className="size-4" aria-hidden />
          เล่นกลุ่มนี้
        </button>

        {/* Secondary row: score + edit */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onScore(group.id)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:border-border-strong hover:text-text"
          >
            ดูคะแนน
          </button>
          <button
            type="button"
            onClick={() => onEdit(group.id)}
            className="flex items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:border-border-strong hover:text-text"
            aria-label={`แก้ไขกลุ่ม ${group.name}`}
          >
            <Pencil className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </article>
  );
}

export function Groups() {
  const router = useRouter();
  const { groups, loading, error } = useGroups();
  const { players } = usePlayers();

  // groupId of the group whose score dialog is open; null = closed.
  const [scoreGroupId, setScoreGroupId] = useState<string | null>(null);
  // groupId of the group being edited; null = closed.
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // playThisGroup port (L682): filter to existing players, guard < 2, then
  // navigate to / with preset URL param so RoundSetup pre-selects them.
  function handlePlay(group: Group): string | null {
    const validIds = group.playerIds.filter((id) =>
      players.some((p) => p.id === id),
    );
    if (validIds.length < 2) {
      return "สมาชิกของกลุ่มนี้เหลือน้อยกว่า 2 คน ไม่สามารถเริ่มเกมได้";
    }
    router.push(`/?preset=${validIds.join(",")}`);
    return null;
  }

  async function handleRename(newName: string) {
    if (!editGroupId) return;
    setEditBusy(true);
    setEditError(null);
    try {
      await renameGroup(editGroupId, newName);
      setEditGroupId(null);
    } catch {
      setEditError("เปลี่ยนชื่อไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่");
    } finally {
      setEditBusy(false);
    }
  }

  async function handleDelete() {
    if (!editGroupId) return;
    setEditBusy(true);
    setEditError(null);
    try {
      await deleteGroup(editGroupId);
      setEditGroupId(null);
    } catch {
      setEditError("ลบกลุ่มไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่");
    } finally {
      setEditBusy(false);
    }
  }

  function handleEditClose() {
    if (editBusy) return;
    setEditGroupId(null);
    setEditError(null);
  }

  // Resolved groups/players for open dialogs.
  const scoreGroup = scoreGroupId
    ? (groups.find((g) => g.id === scoreGroupId) ?? null)
    : null;
  const editGroup = editGroupId
    ? (groups.find((g) => g.id === editGroupId) ?? null)
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">ขาประจำ</h1>
        <p className="mt-1 text-sm text-text-muted">
          {groups.length > 0
            ? `${groups.length} กลุ่ม — สร้างอัตโนมัติจากรอบที่เล่น`
            : "\u00a0"}
        </p>
      </div>

      {/* Loading state */}
      {loading ? (
        <div
          className="flex flex-col items-center gap-3 py-20 text-text-muted"
          aria-live="polite"
          aria-label="กำลังโหลด"
        >
          <Loader2 className="size-8 animate-spin" aria-hidden />
          <span className="text-sm">กำลังโหลดกลุ่ม...</span>
        </div>
      ) : error ? (
        /* Error state */
        <div
          className="flex flex-col items-center gap-3 py-20 text-danger"
          role="alert"
        >
          <TriangleAlert className="size-8" aria-hidden />
          <p className="text-sm font-medium">โหลดกลุ่มไม่สำเร็จ</p>
          <p className="text-xs text-text-muted">
            กรุณาตรวจสอบอินเทอร์เน็ตแล้วรีเฟรชหน้า
          </p>
        </div>
      ) : groups.length === 0 ? (
        /* Intentional empty state */
        <div className="flex flex-col items-center gap-4 py-20 text-text-muted">
          <ClipboardList className="size-12 text-border-strong" aria-hidden />
          <div className="text-center">
            <p className="font-semibold text-text">ยังไม่มีกลุ่มขาประจำ</p>
            <p className="mt-1 text-sm">
              บันทึกรอบแรกจากหน้าหลักเพื่อสร้างกลุ่มอัตโนมัติ
            </p>
          </div>
        </div>
      ) : (
        /* Group cards grid */
        <ul className="grid gap-4 sm:grid-cols-2">
          {groups.map((group) => (
            <li key={group.id}>
              <GroupCard
                group={group}
                players={players}
                onPlay={handlePlay}
                onScore={(id) => setScoreGroupId(id)}
                onEdit={(id) => {
                  setEditError(null);
                  setEditGroupId(id);
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Group score dialog */}
      {scoreGroup ? (
        <GroupScoreDialog
          group={scoreGroup}
          players={players}
          onClose={() => setScoreGroupId(null)}
        />
      ) : null}

      {/* Edit group dialog */}
      {editGroup ? (
        <EditGroupDialog
          group={editGroup}
          busy={editBusy}
          error={editError}
          onRename={handleRename}
          onDelete={handleDelete}
          onClose={handleEditClose}
        />
      ) : null}
    </div>
  );
}
