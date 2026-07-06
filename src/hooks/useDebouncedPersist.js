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
      store.set(key, JSON.stringify(valueRef.current)).catch(() => {});
    };
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, [key, dataLoaded]);
}
