import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "LiveBuoy — Smart Emergency Safety Bag",
  description: "Protect what matters. Stay connected when it matters most.",
};

export const viewport: Viewport = { themeColor: "#3f6df0" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
