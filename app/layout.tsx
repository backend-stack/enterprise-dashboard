import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulse — Enterprise Dashboard",
  description:
    "Monitor messages, conversions, store traffic and revenue in one place.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
