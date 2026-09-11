"use client";

import { useEffect, useRef, useState } from "react";

/** Load the muted video immediately; retry playback when media or interaction permits it. */
export function AmbientVideo({ className = "" }: { className?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    // Set the DOM properties as well as JSX attributes before attempting autoplay.
    element.defaultMuted = true;
    element.muted = true;
    element.playsInline = true;
    element.playbackRate = 0.8;
    let visible = true;
    const sync = () => {
      // The hero film is intentionally automatic, as requested by the site owner.
      // Reduced-motion preferences still govern interface and scroll animations.
      if (visible && !document.hidden) {
        if (!element.paused) {
          setPlaying(true);
          return;
        }
        void element.play().catch(() => {
          /* canplay or the next natural interaction retries a blocked start. */
        });
      } else element.pause();
    };
    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            ([entry]) => {
              visible = entry.isIntersecting;
              sync();
            },
            { threshold: 0.01 },
          )
        : null;
    observer?.observe(element);
    document.addEventListener("visibilitychange", sync);
    element.addEventListener("canplay", sync);
    document.addEventListener("pointerdown", sync, { passive: true });
    document.addEventListener("keydown", sync);
    sync();
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", sync);
      element.removeEventListener("canplay", sync);
      document.removeEventListener("pointerdown", sync);
      document.removeEventListener("keydown", sync);
      element.pause();
    };
  }, []);
  return (
    <div
      className={`ambient-video ${playing ? "is-playing" : ""} ${className}`}
    >
      <video
        ref={video}
        src="/media/decola-motion.mp4"
        poster="/media/decola-motion-poster.jpg"
        muted
        autoPlay
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => {
          setPlaying(false);
        }}
      />
      <div className="video-wash" aria-hidden="true" />
    </div>
  );
}
