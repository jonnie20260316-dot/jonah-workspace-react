import { useState, useCallback, useEffect } from "react";

export function useDeviceEnumeration() {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);

  const enumerateDevicesNow = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      const audioInputs = devices.filter((d) => d.kind === "audioinput");
      setCameras(videoInputs);
      setMics(audioInputs);
    } catch (err) {
      console.error("enumerateDevices failed:", err);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    enumerateDevicesNow();
    const handler = () => enumerateDevicesNow();
    navigator.mediaDevices.addEventListener("devicechange", handler);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handler);
    };
  }, [enumerateDevicesNow]);

  return { cameras, mics, enumerateDevicesNow };
}
