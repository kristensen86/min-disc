import { useEffect, useRef } from "react";

const SWIPE_THRESHOLD = 70;
const MAX_DURATION = 600;
const HORIZONTAL_RATIO = 1.5;

// Swipe left/right between adjacent tabs in `order`. No wrap-around at the ends.
// Any touch that starts inside an element (or ancestor) tagged data-no-swipe="true"
// is ignored entirely, so internal horizontal scrollers (Flight Matrix, bag
// comparison, chip rows, modals) keep their own gestures untouched.
//
// `container` must be the actual DOM node (e.g. via useState + a callback ref),
// not a useRef object — the effect needs container identity to change from null
// to the mounted node to re-attach listeners once it exists (this component tree
// mounts the container later than first render, behind an auth/data-loading gate).
export function useSwipeNav(container, order, currentTab, onNavigate) {
  const gesture = useRef(null);

  useEffect(() => {
    if (!container) return;

    function onTouchStart(e) {
      if (e.target.closest?.('[data-no-swipe="true"]')) {
        gesture.current = null;
        return;
      }
      const t = e.touches[0];
      gesture.current = { startX: t.clientX, startY: t.clientY, startTime: Date.now(), deltaX: 0, horizontal: false };
    }

    function onTouchMove(e) {
      const g = gesture.current;
      if (!g) return;
      const t = e.touches[0];
      const deltaX = t.clientX - g.startX;
      const deltaY = t.clientY - g.startY;
      g.deltaX = deltaX;
      g.horizontal = Math.abs(deltaX) > Math.abs(deltaY) * HORIZONTAL_RATIO;
    }

    function onTouchEnd() {
      const g = gesture.current;
      gesture.current = null;
      if (!g || !g.horizontal) return;
      if (Date.now() - g.startTime > MAX_DURATION) return;
      if (Math.abs(g.deltaX) < SWIPE_THRESHOLD) return;

      const idx = order.indexOf(currentTab);
      if (idx === -1) return;
      const nextIdx = g.deltaX < 0 ? idx + 1 : idx - 1;
      if (nextIdx < 0 || nextIdx >= order.length) return;
      onNavigate(order[nextIdx]);
    }

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    container.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
    };
  }, [container, order, currentTab, onNavigate]);
}
