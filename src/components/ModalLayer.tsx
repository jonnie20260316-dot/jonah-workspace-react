import { CardModal } from "../modals/CardModal";
import { ThreadsIntelModal } from "../modals/ThreadsIntelModal";
import { PromptedNotesModal } from "../modals/PromptedNotesModal";
import { SpotifyPresetModal } from "../modals/SpotifyPresetModal";
import { ConfirmDialog } from "../modals/ConfirmDialog";

/**
 * ModalLayer renders all modals.
 * Should be mounted once in App.tsx.
 * Each modal is rendered conditionally based on store state.
 */
export function ModalLayer() {
  return (
    <>
      <CardModal />
      <ThreadsIntelModal />
      <PromptedNotesModal />
      <SpotifyPresetModal />
      <ConfirmDialog />
    </>
  );
}
