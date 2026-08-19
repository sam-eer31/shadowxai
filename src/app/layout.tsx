import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
  ],
};

export const metadata: Metadata = {
  title: "Shadow — AI Chat Assistant",
  description:
    "A privacy-focused AI chat application. Bring your own API keys for Ollama, Gemini, and Cloudflare. Your data stays in your browser.",
  keywords: ["AI", "chat", "assistant", "Ollama", "Gemini", "privacy", "open-source"],
  icons: {
    icon: "/favicon.ico",
  },
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
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let theme = localStorage.getItem('shadow_theme');
                if (!theme) {
                  const dbReq = indexedDB.open('keyval-store');
                  dbReq.onsuccess = () => {
                    try {
                      const db = dbReq.result;
                      const tx = db.transaction('keyval');
                      const store = tx.objectStore('keyval');
                      const getReq = store.get('shadow_settings');
                      getReq.onsuccess = () => {
                        if (getReq.result && getReq.result.theme) {
                          theme = getReq.result.theme;
                          localStorage.setItem('shadow_theme', theme);
                          if (theme === 'system') {
                            document.documentElement.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
                          } else {
                            document.documentElement.classList.toggle('dark', theme === 'dark');
                          }
                        }
                      };
                    } catch (e) {}
                  };
                } else {
                  if (theme === 'system') {
                    document.documentElement.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
                  } else {
                    document.documentElement.classList.toggle('dark', theme === 'dark');
                  }
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="antialiased selection:bg-indigo-500/20 selection:text-indigo-300">
        {children}
      </body>
    </html>
  );
}

