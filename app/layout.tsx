import type { Metadata } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "DrinkIt — camera-assisted water tracking",
  description:
    "DrinkIt watches for drinking with your laptop camera, tracks your daily water benchmarks, and nags gently until you hit your goal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Nav />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-8 text-center text-xs text-slate-400">
          DrinkIt v1 · Your video never leaves this device · Amounts per
          drink are estimates, not measurements
        </footer>
      </body>
    </html>
  );
}
