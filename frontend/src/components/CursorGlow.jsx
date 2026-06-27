/**
 * CursorGlow — Premium ambient cursor-reactive background effect.
 *
 * Design principles:
 *  - GPU-only transforms (no left/top repaints, only `transform`)
 *  - Lerp-based interpolation for smooth, lagged tracking
 *  - rAF loop — target 60fps, never blocks the main thread
 *  - Respects prefers-reduced-motion (static ambient, no movement)
 *  - Disabled on mobile (<768px) to preserve perf and avoid touch weirdness
 *  - Tablet gets 50% opacity
 *  - z-index: -1 relative to page-wrapper — always behind all content
 */

import { useEffect, useRef } from 'react';
import './CursorGlow.css';

// Lerp factor — lower = smoother/lazier, higher = snappier
const LERP = 0.055;

// Half of glow diameter (700px) — used to center the glow on the cursor
const HALF = 350;

export default function CursorGlow() {
  const glowRef = useRef(null);

  // Mutable refs avoid re-renders; only the DOM is updated in the rAF loop
  const pos = useRef({ x: 0, y: 0 });       // current interpolated position
  const target = useRef({ x: 0, y: 0 });    // raw cursor position
  const raf = useRef(null);
  const mounted = useRef(false);

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;

    // — Capability checks —
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

    if (isMobile) {
      // Leave glow hidden (opacity: 0 via CSS)
      return;
    }

    // Set intensity for tablet
    if (isTablet) {
      glow.style.setProperty('--glow-opacity', '0.5');
    }

    // Center starting position off-screen so it fades in naturally on first move
    const startX = window.innerWidth / 2;
    const startY = -HALF * 2; // start above the viewport
    pos.current = { x: startX, y: startY };
    target.current = { x: startX, y: startY };
    glow.style.transform = `translate(${startX - HALF}px, ${startY - HALF}px)`;

    // — Reduced Motion: static ambient glow, no tracking —
    if (prefersReducedMotion) {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight * 0.35;
      glow.style.transform = `translate(${cx - HALF}px, ${cy - HALF}px)`;
      glow.style.opacity = isTablet ? '0.5' : '1';
      return;
    }

    // — Mouse handler — passive for no scroll-blocking —
    const onMouseMove = (e) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;

      // Fade in on first cursor contact
      if (!mounted.current) {
        mounted.current = true;
        glow.style.opacity = isTablet ? '0.5' : '1';
      }
    };

    // — rAF loop — only runs transform changes, no layout triggers —
    const tick = () => {
      // Linear interpolation toward target
      pos.current.x += (target.current.x - pos.current.x) * LERP;
      pos.current.y += (target.current.y - pos.current.y) * LERP;

      // Integer pixel snapping avoids sub-pixel repaint cost
      const x = (pos.current.x - HALF) | 0;
      const y = (pos.current.y - HALF) | 0;

      glow.style.transform = `translate(${x}px, ${y}px)`;
      raf.current = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      className="cursor-glow"
      aria-hidden="true"
      role="presentation"
    />
  );
}
