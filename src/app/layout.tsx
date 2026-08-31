import type { Metadata, Viewport } from "next";
import { Prompt } from "next/font/google";
import { Spade } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import "./globals.css";

// Prompt is the primary typeface. It carries full Thai + Latin support.
const prompt = Prompt({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-prompt",
  display: "swap",
});

export const metadata: Metadata = {
  title: "COSMO999",
  description: "กระดานนับแต้มไพ่ดัมมี่สำหรับวงเพื่อน เล่นเพื่อความบันเทิง",
};

// viewportFit: "cover" lets the bottom tab bar pad itself past the home
// indicator on notched phones via env(safe-area-inset-bottom).
export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={prompt.variable}>
      <body>
        <div className="md:flex">
          <AppNav />

          <div className="flex min-h-dvh flex-1 flex-col">
            {/* Brand bar - shown on every page so individual routes only
                render their own content. */}
            <header className="reveal sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
              <div className="mx-auto flex w-full max-w-5xl items-center gap-2.5 px-4 py-3 sm:px-6">
                <span className="grid size-9 place-items-center rounded-md border border-border-strong bg-surface-raised text-accent shadow-gold">
                  <Spade className="size-5" />
                </span>
                <div className="leading-tight">
                  <p className="text-lg font-bold tracking-[0.08em]">COSMO999</p>
                  <p className="text-xs text-text-muted">โต๊ะไพ่ดัมมี่</p>
                </div>
              </div>
            </header>

            <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-10">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
