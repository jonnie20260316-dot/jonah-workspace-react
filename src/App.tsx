import { Canvas } from "./components/Canvas";
import { FAB } from "./components/FAB";
import { ModalLayer } from "./components/ModalLayer";
import { FloatingTopBar } from "./components/FloatingTopBar";
import { Sidebar } from "./components/Sidebar";
import { GearMenu } from "./components/GearMenu";
import { RichTextToolbar } from "./components/RichTextToolbar";
import { ToastContainer } from "./components/Toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useTimerTick } from "./hooks/useTimerTick";
import { useSyncBoot } from "./hooks/useSyncBoot";
import { useGitQuit } from "./hooks/useGitQuit";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { FitButton } from "./components/FitButton";
import { ToolBar } from "./components/ToolBar";

export default function App() {
  useTimerTick();
  useSyncBoot();
  useGitQuit();
  useKeyboardShortcuts();

  return (
    <ErrorBoundary>
      <div style={{ width: "100vw", height: "100vh" }}>
        <FloatingTopBar />
        <Sidebar />
        <GearMenu />
        <ErrorBoundary>
          <Canvas />
        </ErrorBoundary>
        <RichTextToolbar />
        <FAB />
        <ModalLayer />
        <ToastContainer />
        <FitButton />
        <ToolBar />
      </div>
    </ErrorBoundary>
  );
}
