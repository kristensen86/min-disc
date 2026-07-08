import { useEffect, useRef } from "react";
import { store } from "../store";

const DEBOUNCE_MS = 800;

export function useDebouncedPersist(key, value, dataLoaded) {
  const timeoutRef = useRef(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (!dataLoaded) return;
    timeoutRef.current = setTimeout(() => {
      store.set(key, JSON.stringify(value)).catch(() => {});
      timeoutRef.current = null;
    }, DEBOUNCE_MS);
    return () => clearTimeout(timeoutRef.current);
  }, [key, value, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    const flush = () => {
      if (timeoutRef.current == null) return;
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      store.setUrgent(key, JSON.stringify(valueRef.current)).catch(() => {});
    };
    const onVisibilityChange = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, [key, dataLoaded]);
}
