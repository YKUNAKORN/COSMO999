"use client";

// Create-player form: Thai name plus an optional profile image that is
// downscaled in the browser before it is written. The live players listener
// picks up the new row on its own, so there is no success callback here.
import { useRef, useState } from "react";
import { ImagePlus, Loader2, UserPlus } from "lucide-react";
import { fileToResizedDataUrl } from "@/lib/image";
import { createPlayer } from "@/lib/players";

export function CreatePlayerForm() {
  const [name, setName] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
      const file = fileRef.current?.files?.[0];
      const image = file ? await fileToResizedDataUrl(file) : undefined;
      await createPlayer(trimmed, image);
      setName("");
      setFileName(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "เพิ่มผู้เล่นไม่สำเร็จ");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-card"
    >
      <h2 className="text-lg font-semibold">เพิ่มผู้เล่นใหม่</h2>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-text-muted">ชื่อผู้เล่น</span>
        <input
          type="text"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          placeholder="เช่น สมชาย"
          className="rounded-md border border-border bg-bg px-3 py-2 text-base outline-none focus:border-border-strong"
        />
      </label>

      <div className="flex flex-col gap-1.5 text-sm">
        <span className="text-text-muted">รูปโปรไฟล์ (ไม่บังคับ)</span>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 self-start rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-accent transition-colors hover:border-border-strong"
        >
          <ImagePlus className="size-4" />
          {fileName ?? "เลือกรูป"}
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

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 font-semibold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <UserPlus className="size-4" />
        )}
        เพิ่มผู้เล่น
      </button>
    </form>
  );
}
