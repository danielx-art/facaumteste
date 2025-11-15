"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const KEY_LAST_PATH = "last_path";

export function LastLocationTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPathRef = useRef<string | null>(null);

  // 1) Track route changes
  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith("/auth/")) return;

    const search = searchParams?.toString();
    const path = search ? `${pathname}?${search}` : pathname;

    lastPathRef.current = path;
    try {
      localStorage.setItem(KEY_LAST_PATH, path);
    } catch {
      // ignore
    }
  }, [pathname, searchParams]);

  // 2) Attach beforeunload once, read from ref to avoid stale closures
  useEffect(() => {
    const onBeforeUnload = () => {
      const path =
        lastPathRef.current ??
        `${window.location.pathname}${window.location.search ?? ""}`;
      try {
        localStorage.setItem(KEY_LAST_PATH, path);
      } catch {

      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  return null;
}