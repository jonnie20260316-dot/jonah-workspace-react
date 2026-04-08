import { useState, useRef } from "react";
import { loadJSON, saveJSON } from "../../utils/storage";

export function useYouTubeBitrate() {
  const [bitrate, setBitrateState] = useState<number>(() =>
    loadJSON<number>("youtube-studio-bitrate", 3_000_000)
  );
  const bitrateRef = useRef<number>(loadJSON<number>("youtube-studio-bitrate", 3_000_000));

  const handleBitrateChange = (bps: number) => {
    setBitrateState(bps);
    bitrateRef.current = bps;
    saveJSON("youtube-studio-bitrate", bps);
  };

  return { bitrate, bitrateRef, handleBitrateChange };
}
