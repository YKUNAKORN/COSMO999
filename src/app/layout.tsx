import type { Metadata } from "next";
import { Prompt } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={prompt.variable}>
      <body>{children}</body>
    </html>
  );
}
