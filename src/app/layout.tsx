import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/components/AuthProvider";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Dobara",
  description: "Buy, sell and exchange preloved bridal and formal Pakistani suits. Worn once, loved again.",
  manifest: "/manifest.json",
  applicationName: "Dobara",
  appleWebApp: {
    capable: true,
    title: "Dobara",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#4E1622",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Jost:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        {/* Capture the install prompt as early as possible so the Install button can use it */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__bipEvent=e;window.dispatchEvent(new Event('bipready'));});window.addEventListener('appinstalled',function(){window.__bipEvent=null;});})();`,
          }}
        />
        <AuthProvider>{children}</AuthProvider>
        <ServiceWorkerRegister />
        <Analytics />
      </body>
    </html>
  );
}
