import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: {
    default: "HitResolver — Make Better Decisions, Every Day!",
    template: "%s · HitResolver",
  },
  description:
    "Turn complex decisions into clear choices. Organize alternatives, evaluate trade-offs, compare possibilities, and make better-informed decisions.",
  applicationName: "HitResolver",
  keywords: [
    "decision making",
    "decision matrix",
    "weighted scoring",
    "SWOT analysis",
    "pros and cons",
    "decision intelligence",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
};

/**
 * Applies the persisted theme before paint so there is no flash of the
 * wrong colour scheme. Kept tiny and dependency-free.
 */
const themeScript = `
(function () {
  try {
    var t = localStorage.getItem("hitresolver:v1:theme");
    if (t !== "light" && t !== "dark") {
      t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    if (t === "dark") document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
