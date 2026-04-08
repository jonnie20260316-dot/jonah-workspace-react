import { useState, useCallback, useEffect } from "react";

export function useScreenPermission() {
  const [screenPermDenied, setScreenPermDenied] = useState(false);

  const refreshScreenPermission = useCallback(async () => {
    if (!window.electronAPI?.getScreenPermissionStatus) return;
    try {
      const status = await window.electronAPI.getScreenPermissionStatus();
      setScreenPermDenied(status === "denied" || status === "restricted");
    } catch (err) {
      console.warn("screen permission status check failed:", err);
    }
  }, []);

  const openScreenRecordingSettings = useCallback(async () => {
    try {
      await window.electronAPI?.openScreenRecordingSettings?.();
    } catch (err) {
      console.warn("open screen recording settings failed:", err);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshScreenPermission();

    const onFocus = () => {
      refreshScreenPermission();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshScreenPermission();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refreshScreenPermission]);

  return { screenPermDenied, openScreenRecordingSettings };
}
