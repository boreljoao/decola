"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

/** Decorative video loads after hydration; the poster is the default on slow connections. */
export function AmbientVideo({ className = "" }: { className?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const wanted = useRef(true);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    const saveData =
      !!connection?.saveData ||
      ["slow-2g", "2g"].includes(connection?.effectiveType ?? "");
    wanted.current = !reduced.matches && !saveData;
    let visible = true;
    const sync = () => {
      if (wanted.current && visible && !document.hidden) {
        if (!element.getAttribute("src")) {
          element.src = "/media/decola-motion.mp4";
          element.load();
        }
        void element.play().catch(() => {
          /* Keep the poster and manual play control. */
        });
      } else element.pause();
    };
    const preferenceChanged = () => {
      wanted.current = !reduced.matches && !saveData;
      sync();
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
    reduced.addEventListener("change", preferenceChanged);
    sync();
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", preferenceChanged);
      element.pause();
    };
  }, []);
  function toggle() {
    const element = video.current;
    if (!element) return;
    wanted.current = element.paused;
    if (!wanted.current) element.pause();
    else {
      if (!element.getAttribute("src")) {
        element.src = "/media/decola-motion.mp4";
        element.load();
      }
      void element.play().catch(() => setPlaying(false));
    }
  }
  return (
    <>
      <div className={`ambient-video ${className}`}>
        <video
          ref={video}
          poster="/media/decola-motion-poster.jpg"
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
          tabIndex={-1}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => {
            setFailed(true);
            setPlaying(false);
          }}
        />
        <div className="video-wash" aria-hidden="true" />
      </div>
      {!failed && (
        <button
          className="video-control"
          type="button"
          onClick={toggle}
          aria-label={
            playing ? "Pausar vídeo de fundo" : "Reproduzir vídeo de fundo"
          }
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
          <span>{playing ? "Pausar movimento" : "Ativar movimento"}</span>
        </button>
      )}
    </>
  );
}
