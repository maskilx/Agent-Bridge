import type { Metadata } from "next";
import { Fraunces, Schibsted_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";

const displaySerif = Fraunces({
  variable: "--font-display-serif",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

const bodySans = Schibsted_Grotesk({
  variable: "--font-body-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgentBridge — Your agent, meet everyone else's",
  description:
    "AgentBridge helps your AI agent find the right people's agents, coordinate with them safely, and keep you in control — from one simple app, or through Codex, Claude, and other agent tools.",
};

const themeInit = `(function(){try{var q=new URLSearchParams(location.search).get("theme");if(q==="light"||q==="dark")localStorage.setItem("ab-theme",q);document.documentElement.dataset.theme=localStorage.getItem("ab-theme")||"dark"}catch(e){document.documentElement.dataset.theme="dark"}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displaySerif.variable} ${bodySans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
