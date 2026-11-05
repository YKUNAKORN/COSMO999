"use client";

// Groups page client component. Ported from legacy renderGroups (L1451),
// playThisGroup (L682), showGroupScore (L1484), and editGroup (L1530).
// Mobile-first iOS guidelines: min 44px+ touch targets on all interactive controls,
// active:scale-95 feedback, and responsive grid layout (1 col on iPhone, 2 cols on iPad).
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Loader2,
  Play,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { EditGroupDialog } from "@/components/EditGroupDialog";
import { GroupScoreDialog } from "@/components/GroupScoreDialog";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useGroups } from "@/hooks/useGroups";
import { useHistory } from "@/hooks/useHistory";
import { usePlayers } from "@/hooks/usePlayers";
import { deleteGroup } from "@/lib/groups";
import type { Group, Player } from "@/types/models";

function GroupAvatarItem({
  player,
  isSelected,
  onToggle,
}: {
  player: Player;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const show = hovered || isSelected;

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        title={player.name}
        aria-label={`ผู้เล่น ${player.name}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`group relative rounded-full p-0.5 transition-all duration-200 cursor-pointer block active:scale-95 ${
          isSelected
            ? "ring-2 ring-[#007AFF] ring-offset-2 dark:ring-offset-[#1C1C1E] scale-105"
            : "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/40"
        }`}
      >
        <PlayerAvatar player={player} className="size-11 text-base shadow-xs" />
      </button>

      {/* Floating Name Tooltip */}
      {show && (
        <div
          role="tooltip"
          className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded-lg bg-[#1C1C1E] dark:bg-white px-2.5 py-1 text-xs font-semibold text-white dark:text-[#1C1C1E] shadow-xl pointer-events-none animate-in fade-in zoom-in-95 duration-150"
        >
          {player.name}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#1C1C1E] dark:border-t-white" />
        </div>
      )}
    </div>
  );
}

function GroupCard({
  group,
  players,
  onPlay,
  onScore,
  onEdit,
}: {
  group: Group;
  players: Player[];
  onPlay: (group: Group) => string | null;
  onScore: (groupId: string) => void;
  onEdit: (groupId: string) => void;
}) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);

  function handlePlay() {
    const err = onPlay(group);
    setPlayError(err);
  }

  return (
    <article
      onClick={() => setSelectedPlayerId(null)}
      className="reveal flex flex-col justify-between gap-5 rounded-[20px] border border-black/[0.04] dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all"
    >
      {/* Group member profile avatars in 1 single row */}
      <div className="relative flex items-center justify-center gap-2 sm:gap-2.5 pt-7 pb-1 overflow-visible">
        {group.playerIds.map((id) => {
          const player = players.find((x) => x.id === id);
          if (!player) {
            return (
              <span
                key={id}
                title="ผู้เล่นถูกลบ"
                className="flex size-11 shrink-0 items-center justify-center rounded-full border border-dashed border-black/[0.1] dark:border-white/20 bg-black/[0.04] dark:bg-white/5 text-xs text-[#8E8E93] dark:text-[#98989D]"
              >
                ?
              </span>
            );
          }
          return (
            <GroupAvatarItem
              key={player.id}
              player={player}
              isSelected={selectedPlayerId === player.id}
              onToggle={() =>
                setSelectedPlayerId((prev) => (prev === player.id ? null : player.id))
              }
            />
          );
        })}
      </div>

      {/* Play error */}
      {playError ? (
        <p role="alert" className="rounded-2xl border border-red-200/80 dark:border-red-500/30 bg-red-50/80 dark:bg-red-500/10 p-3 text-xs font-medium text-[#FF3B30] dark:text-[#FF453A] backdrop-blur-sm">
          {playError}
        </p>
      ) : null}

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:gap-2.5">
        {/* Primary: play */}
        <button
          type="button"
          onClick={handlePlay}
          className="flex min-h-[44px] sm:min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#2E8BFF] to-[#007AFF] px-5 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 ease-out active:scale-[0.97] hover:opacity-90 cursor-pointer"
        >
          <Play className="size-4 sm:size-4.5 fill-current" aria-hidden />
          เล่นกลุ่มนี้
        </button>

        {/* Secondary row: score + delete */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onScore(group.id)}
            className="flex min-h-[40px] sm:min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full border border-black/[0.06] dark:border-[#38383A] bg-white dark:bg-[#2C2C2E] px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] shadow-2xs transition-all duration-200 ease-out active:scale-[0.97] hover:bg-gray-50 dark:hover:bg-[#38383A] cursor-pointer"
          >
            ดูคะแนน
          </button>
          <button
            type="button"
            onClick={() => onEdit(group.id)}
            className="flex size-10 sm:size-11 min-h-[40px] sm:min-h-[44px] min-w-[40px] sm:min-w-[44px] items-center justify-center rounded-full border border-black/[0.06] dark:border-[#38383A] bg-white dark:bg-[#2C2C2E] text-[#8E8E93] dark:text-[#98989D] shadow-2xs transition-all duration-200 ease-out active:scale-[0.97] hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-200 dark:hover:border-red-900/40 hover:text-[#FF3B30] dark:hover:text-[#FF453A] cursor-pointer"
            aria-label="ลบกลุ่มขาประจำ"
          >
            <Trash2 className="size-4 sm:size-4.5" aria-hidden />
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
  const { history, loading: historyLoading, error: historyError } = useHistory();

  const [scoreGroupId, setScoreGroupId] = useState<string | null>(null);
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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


  async function handleDelete() {
    if (!editGroupId) return;
    setEditBusy(true);
    setEditError(null);
    try {
      await deleteGroup(editGroupId);
      setEditGroupId(null);
    } catch (error) {
      console.error("[groups] delete failed", error);
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

  // Find the last played timestamp for each group from history
  const groupLastPlayed = useMemo(() => {
    const map: Record<string, number> = {};
    for (const entry of history) {
      const time = new Date(entry.timestamp).getTime();
      if (Number.isNaN(time)) continue;

      if (entry.groupId) {
        if (map[entry.groupId] === undefined || time > map[entry.groupId]) {
          map[entry.groupId] = time;
        }
      }

      if (entry.playerScores) {
        const sortedKey = Object.keys(entry.playerScores).sort().join("_");
        if (sortedKey && (map[sortedKey] === undefined || time > map[sortedKey])) {
          map[sortedKey] = time;
        }
      }
    }
    return map;
  }, [history]);

  // Sort groups: most recently played groups first (latest at top), then alphabetically by name
  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => {
      const sortedAKey = [...a.playerIds].sort().join("_");
      const sortedBKey = [...b.playerIds].sort().join("_");
      const timeA = Math.max(groupLastPlayed[a.id] ?? -1, groupLastPlayed[sortedAKey] ?? -1);
      const timeB = Math.max(groupLastPlayed[b.id] ?? -1, groupLastPlayed[sortedBKey] ?? -1);
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      return a.name.localeCompare(b.name, "th");
    });
  }, [groups, groupLastPlayed]);

  const scoreGroup = scoreGroupId
    ? (groups.find((g) => g.id === scoreGroupId) ?? null)
    : null;
  const editGroup = editGroupId
    ? (groups.find((g) => g.id === editGroupId) ?? null)
    : null;

  return (
    <div className="mx-auto max-w-2xl px-1 sm:px-4 py-4 sm:py-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[#1C1C1E] dark:text-[#F2F2F7] sm:text-3xl">
          ขาประจำ
        </h1>
        <p className="mt-1 text-sm text-[#8E8E93] dark:text-[#98989D]">
          {sortedGroups.length > 0 ? `${sortedGroups.length} กลุ่ม` : "\u00a0"}
        </p>
      </div>

      {/* Loading state */}
      {loading ? (
        <div
          className="flex flex-col items-center gap-3 py-20 text-[#8E8E93] dark:text-[#98989D]"
          aria-live="polite"
          aria-label="กำลังโหลด"
        >
          <Loader2 className="size-8 animate-spin text-[#007AFF] dark:text-[#2E8BFF]" aria-hidden />
          <span className="text-sm font-medium">กำลังโหลดกลุ่ม...</span>
        </div>
      ) : error ? (
        <div
          className="flex flex-col items-center gap-3 py-20 text-[#FF3B30] dark:text-[#FF453A]"
          role="alert"
        >
          <TriangleAlert className="size-8" aria-hidden />
          <p className="text-sm font-semibold">โหลดกลุ่มไม่สำเร็จ</p>
          <p className="text-xs text-[#8E8E93] dark:text-[#98989D]">
            กรุณาตรวจสอบอินเทอร์เน็ตแล้วรีเฟรชหน้า
          </p>
        </div>
      ) : sortedGroups.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-[20px] border border-black/[0.04] dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] p-12 text-center text-[#8E8E93] dark:text-[#98989D] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="grid size-14 place-items-center rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-[#8E8E93] dark:text-[#98989D]">
            <ClipboardList className="size-7" aria-hidden />
          </div>
          <div>
            <p className="font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">ยังไม่มีกลุ่มขาประจำ</p>
            <p className="mt-1 text-sm text-[#8E8E93] dark:text-[#98989D]">
              บันทึกรอบแรกจากหน้าหลักเพื่อสร้างกลุ่มอัตโนมัติ
            </p>
          </div>
        </div>
      ) : (
        /* Group cards grid (1 col on iPhone, 2 cols on iPad/desktop) */
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sortedGroups.map((group) => (
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
          history={historyLoading || historyError ? null : history}
          onClose={() => setScoreGroupId(null)}
        />
      ) : null}

      {/* Edit group dialog */}
      {editGroup ? (
        <EditGroupDialog
          group={editGroup}
          busy={editBusy}
          error={editError}
          onDelete={handleDelete}
          onClose={handleEditClose}
        />
      ) : null}
    </div>
  );
}
