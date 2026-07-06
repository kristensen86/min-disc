import { useEffect, useRef, useState } from "react";

export function useServiceWorkerUpdate() {
  const [updateReady, setUpdateReady] = useState(false);
  const waitingWorker = useRef(null);
  const reloadingRef = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onControllerChange = () => {
      if (reloadingRef.current) return;
      reloadingRef.current = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").then(registration => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          waitingWorker.current = registration.waiting;
          setUpdateReady(true);
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              waitingWorker.current = newWorker;
              setUpdateReady(true);
            }
          });
        });
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const applyUpdate = () => {
    waitingWorker.current?.postMessage("SKIP_WAITING");
  };

  return { updateReady, applyUpdate };
}
