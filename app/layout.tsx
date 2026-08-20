import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ReduxProvider } from "@/components/providers/ReduxProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Realtime Messenger | Socket.io & RTK Query",
  description: "Modern real-time chat powered by Next.js, Redux Toolkit, and Socket.io",
  icons: {
    icon: "/Screenshot_2026-08-19_at_11.41.20_AM-removebg-preview.png",
    shortcut: "/Screenshot_2026-08-19_at_11.41.20_AM-removebg-preview.png",
    apple: "/Screenshot_2026-08-19_at_11.41.20_AM-removebg-preview.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ReduxProvider>{children}</ReduxProvider>
      </body>
    </html>
  );
}
