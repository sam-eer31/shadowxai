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
              // Suppress React DevTools warning safely without breaking Fast Refresh
              const origConsoleInfo = console.info;
              console.info = function(...args) {
                if (typeof args[0] === 'string' && args[0].includes('Download the React DevTools')) return;
                return origConsoleInfo.apply(console, args);
              };
              const origConsoleLog = console.log;
              console.log = function(...args) {
                if (typeof args[0] === 'string' && args[0].includes('Download the React DevTools')) return;
                return origConsoleLog.apply(console, args);
              };

              // Suppress Puter's "Refused to set unsafe header Origin"
              const origSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
              XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
                if (header.toLowerCase() === 'origin') return;
                return origSetRequestHeader.apply(this, arguments);
              };

              const origFetch = window.fetch;
              window.fetch = async function(...args) {
                if (args[1] && args[1].headers) {
                  if (args[1].headers instanceof Headers) {
                    args[1].headers.delete('origin');
                    args[1].headers.delete('Origin');
                  } else if (typeof args[1].headers === 'object') {
                    delete args[1].headers['origin'];
                    delete args[1].headers['Origin'];
                  }
                }
                return origFetch.apply(this, args);
              };
              
              // Suppress Puter's "WebSocket is closed before the connection is established"
              const origWsClose = window.WebSocket.prototype.close;
              window.WebSocket.prototype.close = function(code, reason) {
                if (this.readyState === window.WebSocket.CONNECTING) {
                  this.addEventListener('open', () => origWsClose.call(this, code, reason));
                  this.addEventListener('error', () => {});
                } else {
                  origWsClose.call(this, code, reason);
                }
              };
            `
          }}
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

