import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shadow — AI Chat Assistant",
  description:
    "A privacy-focused AI chat application. Bring your own API keys for Ollama, Gemini, and Cloudflare. Your data stays in your browser.",
  keywords: ["AI", "chat", "assistant", "Ollama", "Gemini", "privacy", "open-source"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
