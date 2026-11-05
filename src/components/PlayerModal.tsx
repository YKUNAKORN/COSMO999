"use client";

// iOS-style Modal Sheet for Adding or Editing a Player.
// Follows Apple iOS guidelines: 44px+ touch targets, active:scale-90 squish feedback,
// scale-in-animation, frosted glass backdrop, and full Dark Mode support.
// Supports personalized Emoji avatars (strict original theme) or custom uploaded photo.
import { useEffect, useRef, useState } from "react";
import { Check, Crop, ImagePlus, Loader2, Pencil, Trash2, UserPlus, X } from "lucide-react";
import { AvatarCropperModal } from "@/components/AvatarCropperModal";
import { GlobalModal } from "@/components/GlobalModal";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { uploadAvatar } from "@/lib/avatarStorage";
import { createPlayer, updatePlayer } from "@/lib/players";
import type { Player } from "@/types/models";

export function PlayerModal({
  isOpen,
  player,
  existingPlayers = [],
  onClose,
}: {
  isOpen: boolean;
  player?: Player | null; // null/undefined = Add mode, Player = Edit mode
  existingPlayers?: Player[];
  onClose: () => void;
}) {
  const isEdit = Boolean(player);
  const [name, setName] = useState(player?.name ?? "");
  const [avatarMode, setAvatarMode] = useState<"boring" | "photo">("boring");
  const [previewImage, setPreviewImage] = useState<string | undefined>(player?.image);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const wasOpenRef = useRef(false);

  // Sync state once whenever modal opens or target player changes
  useEffect(() => {
    if (isOpen) {
      if (!wasOpenRef.current) {
        setName(player?.name ?? "");
        setError(null);
        setFileName(null);
        if (fileRef.current) fileRef.current.value = "";

        if (player) {
          const hasPhoto = Boolean(
            player.image &&
              !player.image.startsWith("suit:") &&
              !player.image.startsWith("emoji:") &&
              !player.image.startsWith("boring:") &&
              (player.image.startsWith("data:") ||
                player.image.startsWith("http://") ||
                player.image.startsWith("https://")),
          );
          if (hasPhoto) {
            setAvatarMode("photo");
            setPreviewImage(player.image);
          } else {
            setAvatarMode("boring");
            setPreviewImage(undefined);
          }
        } else {
          // Add mode: default to automatic Boring avatar
          setAvatarMode("boring");
          setPreviewImage(undefined);
        }
      }
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, player, existingPlayers]);

  // Handle ESC key to dismiss modal cleanly
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, pending, onClose]);

  if (!isOpen) return null;

  function handleImagePick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onerror = () => setError("ไม่สามารถอ่านไฟล์รูปภาพได้");
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCropSource(reader.result);
        setIsCropperOpen(true);
      }
    };
    reader.readAsDataURL(file);
    // Reset file input value so choosing the same file again still fires change
    event.target.value = "";
  }

  function handleOpenCropper() {
    if (!previewImage) return;
    setCropSource(previewImage);
    setIsCropperOpen(true);
  }

  function handleCropComplete(croppedDataUrl: string) {
    setPreviewImage(croppedDataUrl);
    setAvatarMode("photo");
    setIsCropperOpen(false);
    setCropSource(null);
  }

  function handleRemoveImage() {
    setPreviewImage(undefined);
    setFileName(null);
    setCropSource(null);
    if (fileRef.current) fileRef.current.value = "";
    setAvatarMode("boring");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || pending) {
      if (!trimmed) setError("กรุณากรอกชื่อผู้เล่น");
      return;
    }

    setPending(true);
    setError(null);
    try {
      // Determine final avatar: photo or boring avatar
      let finalImage = "";
      if (avatarMode === "photo" && previewImage) {
        // Moves a freshly picked photo to Storage; falls back to the inline
        // data URL if Storage is unavailable. Existing http(s) URLs pass through.
        finalImage = await uploadAvatar(previewImage);
      } else {
        finalImage = "boring:beam";
      }

      if (isEdit && player) {
        await updatePlayer(player.id, {
          name: trimmed,
          image: finalImage,
        });
      } else {
        await createPlayer(trimmed, finalImage);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : isEdit ? "บันทึกไม่สำเร็จ" : "เพิ่มผู้เล่นไม่สำเร็จ");
    } finally {
      setPending(false);
    }
  }

  return (
    <GlobalModal
      isOpen={isOpen}
      onClose={onClose}
      preventClose={pending}
      ariaLabelledby="player-modal-title"
    >
      <div className="bg-white dark:bg-[#1C1C1E] w-full max-w-md p-5 sm:p-6 rounded-[24px] shadow-2xl scale-in-animation border border-gray-100 dark:border-white/10 flex flex-col gap-4 sm:gap-4.5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-blue-50 dark:bg-blue-500/15 text-[#007AFF] dark:text-[#2E8BFF] shadow-xs">
              {isEdit ? <Pencil className="size-4.5" /> : <UserPlus className="size-4.5" />}
            </span>
            <h2
              id="player-modal-title"
              className="text-lg font-semibold tracking-tight text-[#1C1C1E] dark:text-[#F2F2F7]"
            >
              {isEdit ? "แก้ไขผู้เล่น" : "เพิ่มผู้เล่นใหม่"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="ปิด"
            className="flex size-11 min-h-[44px] min-w-[44px] items-center justify-center -mr-2 -mt-2 rounded-full text-[#8E8E93] dark:text-[#98989D] transition-all duration-200 active:scale-90 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-[#1C1C1E] dark:hover:text-[#F2F2F7] disabled:opacity-50 cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Live Avatar Preview */}
          <div className="flex flex-col items-center gap-1.5 self-center my-0.5">
            {avatarMode === "photo" && previewImage ? (
              <button
                type="button"
                onClick={handleOpenCropper}
                title="กดเพื่อครอบตัดหรือปรับแต่งมุมรูป"
                className="group relative size-18 rounded-full border border-gray-100 dark:border-white/10 bg-cover bg-center shadow-md block cursor-pointer transition-transform active:scale-95 hover:ring-2 hover:ring-[#007AFF]/50"
                style={{ backgroundImage: `url(${previewImage})` }}
              >
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Crop className="size-5" />
                </span>
              </button>
            ) : (
              <PlayerAvatar
                player={{
                  id: player?.id ?? "preview",
                  name: name || "ผู้เล่นใหม่",
                  image: "boring:beam",
                  totalScore: 0,
                  latestScore: null,
                }}
                className="size-18"
              />
            )}
            <span className="text-[11px] font-medium text-[#8E8E93] dark:text-[#98989D]">
              {avatarMode === "photo" && previewImage ? "รูปถ่ายโปรไฟล์" : "อวาตาร์อัตโนมัติ"}
            </span>
          </div>

          {/* Name input */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="modal-player-name"
              className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93] dark:text-[#98989D]"
            >
              ชื่อผู้เล่น
            </label>
            <input
              id="modal-player-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="เช่น สมชาย (ตัวตึง)"
              disabled={pending}
              autoFocus
              className="bg-[#F2F2F7] dark:bg-[#2C2C2E] border-none rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 w-full text-sm sm:text-base font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] outline-none transition-all placeholder:text-[#8E8E93]/60 dark:placeholder:text-[#98989D]/60 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
            />
          </div>

          {/* Avatar Chooser Mode (Segmented Toggle) */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93] dark:text-[#98989D]">
              รูปโปรไฟล์
            </span>

            <div className="flex rounded-full bg-black/[0.05] dark:bg-white/[0.06] p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAvatarMode("boring")}
                className={`flex-1 min-h-[36px] py-1.5 rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  avatarMode === "boring"
                    ? "bg-white dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-[#F2F2F7] shadow-xs"
                    : "text-[#8E8E93] dark:text-[#98989D] hover:text-[#1C1C1E] dark:hover:text-[#F2F2F7]"
                }`}
              >
                <span>อวาตาร์อัตโนมัติ</span>
              </button>
              <button
                type="button"
                onClick={() => setAvatarMode("photo")}
                className={`flex-1 min-h-[36px] py-1.5 rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  avatarMode === "photo"
                    ? "bg-white dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-[#F2F2F7] shadow-xs"
                    : "text-[#8E8E93] dark:text-[#98989D] hover:text-[#1C1C1E] dark:hover:text-[#F2F2F7]"
                }`}
              >
                <span>อัปโหลดรูป</span>
              </button>
            </div>

            {avatarMode === "photo" ? (
              /* Mode 2: Photo Upload */
              <div className="flex flex-col gap-2 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-[#F2F2F7]/50 dark:bg-[#2C2C2E]/40 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={pending}
                    className="flex min-h-[42px] sm:min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-white dark:bg-[#2C2C2E] px-4 py-2 text-xs sm:text-sm font-semibold text-[#007AFF] dark:text-[#2E8BFF] shadow-2xs active:scale-95 transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer border border-black/[0.05] dark:border-white/[0.08]"
                  >
                    <ImagePlus className="size-4 sm:size-4.5 shrink-0" />
                    <span>{fileName ?? (previewImage ? "เปลี่ยนรูป" : "เลือกรูปจากเครื่อง")}</span>
                  </button>
                  {previewImage ? (
                    <>
                      <button
                        type="button"
                        onClick={handleOpenCropper}
                        disabled={pending}
                        title="ครอบตัดหรือปรับแต่งตำแหน่งรูป"
                        className="flex min-h-[42px] sm:min-h-[44px] items-center gap-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 px-3 py-2 text-xs font-semibold text-[#007AFF] dark:text-[#2E8BFF] active:scale-95 transition-transform cursor-pointer border border-blue-200/50 dark:border-blue-900/40"
                      >
                        <Crop className="size-3.5 shrink-0" />
                        <span>ครอปรูป</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        disabled={pending}
                        className="flex min-h-[42px] sm:min-h-[44px] items-center gap-1 rounded-xl bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs font-semibold text-[#FF3B30] dark:text-[#FF453A] active:scale-95 transition-transform cursor-pointer border border-red-200/50 dark:border-red-900/40"
                      >
                        <Trash2 className="size-3.5 shrink-0" />
                        <span>ลบรูป</span>
                      </button>
                    </>
                  ) : null}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImagePick}
                />
                {previewImage ? (
                  <p className="text-[11px] text-[#8E8E93] dark:text-[#98989D] px-1">
                    ครอบตัดโซนที่เลือกแล้ว (กด &quot;ครอปรูป&quot; เพื่อปรับมุมได้ตลอด)
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Inline error */}
          {error ? (
            <p
              role="alert"
              className="rounded-2xl border border-red-200/80 dark:border-red-500/30 bg-red-50/80 dark:bg-red-500/10 p-3 text-sm text-[#FF3B30] dark:text-[#FF453A] backdrop-blur-sm"
            >
              {error}
            </p>
          ) : null}

          {/* Action buttons */}
          <div className="mt-1 flex flex-col gap-2.5 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={pending}
              className="flex min-h-[44px] sm:min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full bg-[#007AFF] px-5 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-semibold text-white shadow-lg shadow-blue-500/25 active:scale-95 transition-all hover:bg-[#0062cc] disabled:opacity-50 cursor-pointer"
            >
              {pending ? (
                <Loader2 className="size-4 sm:size-4.5 animate-spin" />
              ) : isEdit ? (
                <Check className="size-4 sm:size-4.5 stroke-[2.5]" />
              ) : (
                <UserPlus className="size-4 sm:size-4.5" />
              )}
              {pending ? "กำลังบันทึก..." : isEdit ? "บันทึกข้อมูล" : "เพิ่มผู้เล่น"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="flex min-h-[44px] sm:min-h-[48px] flex-1 items-center justify-center rounded-full border border-gray-100 dark:border-white/10 bg-white dark:bg-[#2C2C2E] px-5 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] shadow-xs active:scale-95 transition-all hover:bg-[#F2F2F7] dark:hover:bg-[#38383A] disabled:opacity-50 cursor-pointer"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      </div>

      <AvatarCropperModal
        isOpen={isCropperOpen}
        imageSrc={cropSource}
        onClose={() => setIsCropperOpen(false)}
        onApply={handleCropComplete}
      />
    </GlobalModal>
  );
}
