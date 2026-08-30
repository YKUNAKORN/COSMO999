import { Club, Diamond, Heart, Spade } from "lucide-react";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div className="flex items-center gap-3 text-accent" aria-hidden>
        <Spade className="size-6" />
        <Heart className="size-6 text-suit-red" />
        <Diamond className="size-6 text-suit-red" />
        <Club className="size-6" />
      </div>

      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">COSMO999</h1>

      <p className="max-w-md text-balance text-text-muted">
        กระดานนับแต้มไพ่ดัมมี่สำหรับวงเพื่อน เล่นเพื่อความบันเทิง
        ตอนนี้วางโครงระบบเสร็จแล้ว รอเริ่มพัฒนาฟีเจอร์ในเฟสถัดไป
      </p>

      <span className="rounded-md border border-border-strong bg-surface-raised px-4 py-2 text-sm text-accent shadow-gold">
        ตั้งค่าโครงโปรเจกต์เสร็จแล้ว
      </span>
    </main>
  );
}
