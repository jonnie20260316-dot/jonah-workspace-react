import { Canvas } from "./components/Canvas";
import { FAB } from "./components/FAB";
import { ModalLayer } from "./components/ModalLayer";
import { FloatingTopBar } from "./components/FloatingTopBar";
import { FloatingStreamControls } from "./components/FloatingStreamControls";
import { Sidebar } from "./components/Sidebar";
import { GearMenu } from "./components/GearMenu";
import { RichTextToolbar } from "./components/RichTextToolbar";
import { ToastContainer } from "./components/Toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { migrateStickyToDaily } from "./utils/storage";
import { useTimerTick } from "./hooks/useTimerTick";
import { useSyncBoot } from "./hooks/useSyncBoot";
import { useGitQuit } from "./hooks/useGitQuit";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { FitButton } from "./components/FitButton";
import { ToolBar } from "./components/ToolBar";
import { ShapePropertiesPanel } from "./components/ShapePropertiesPanel";
import { TextPropertiesPanel } from "./components/TextPropertiesPanel";
import { Minimap } from "./components/Minimap";
import { FullscreenDashboard } from "./components/FullscreenDashboard";

// Run once at module load — before any React render reads sticky fields
migrateStickyToDaily();

export default function App() {
  useTimerTick();
  useSyncBoot();
  useGitQuit();
  useKeyboardShortcuts();

  return (
    <ErrorBoundary>
      <div style={{ width: "100vw", height: "100vh" }}>
        <FloatingTopBar />
        <FloatingStreamControls />
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
        <Minimap />
        <ToolBar />
        <ShapePropertiesPanel />
        <TextPropertiesPanel />
        <FullscreenDashboard />
      </div>
    </ErrorBoundary>
  );
}
