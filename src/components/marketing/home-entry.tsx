"use client";

import { useLayoutEffect } from "react";

let initialEntryHandled = false;

/** Reload the landing page at its opening; preserve anchors and back navigation. */
export function HomeEntry() {
  useLayoutEffect(() => {
    if (initialEntryHandled) return;
    initialEntryHandled = true;
    const navigation = performance.getEntriesByType("navigation")[0] as
      PerformanceNavigationTiming | undefined;
    if (navigation?.type === "reload" && !window.location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, []);

  return null;
}
