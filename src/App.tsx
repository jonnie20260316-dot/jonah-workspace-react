import { Canvas } from "./components/Canvas";
import { FAB } from "./components/FAB";
import { ModalLayer } from "./components/ModalLayer";
import { FloatingTopBar } from "./components/FloatingTopBar";
import { Sidebar } from "./components/Sidebar";
import { GearMenu } from "./components/GearMenu";
import { RichTextToolbar } from "./components/RichTextToolbar";
import { ToastContainer } from "./components/Toast";
import { useTimerTick } from "./hooks/useTimerTick";
import { useSyncBoot } from "./hooks/useSyncBoot";
import { useGitQuit } from "./hooks/useGitQuit";

export default function App() {
  useTimerTick();
  useSyncBoot();
  useGitQuit();

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <FloatingTopBar />
      <Sidebar />
      <GearMenu />
      <Canvas />
      <RichTextToolbar />
      <FAB />
      <ModalLayer />
      <ToastContainer />
    </div>
  );
}
