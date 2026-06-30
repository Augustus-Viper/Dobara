"use client";
import { useEffect } from "react";

// Registers the service worker so Dobara can be installed to the home screen
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const onLoad = () => {
        navigator.serviceWorker
          .register("/sw.js")
          .catch((err) => console.error("SW registration failed:", err));
      };
      window.addEventListener("load", onLoad);
      return () => window.removeEventListener("load", onLoad);
    }
  }, []);

  return null;
}
