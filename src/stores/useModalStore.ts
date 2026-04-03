import { create } from "zustand";

interface CardModalState {
  open: boolean;
  cardId: string | null;
  projectBlockId: string | null;
}

interface TiModalState {
  open: boolean;
  blockId: string | null;
  recordId: string | null;
}

interface PnModalState {
  open: boolean;
  blockId: string | null;
  mode: "config" | "entry" | null;
  entryId: string | null;
}

interface SpotifyModalState {
  open: boolean;
  blockId: string | null;
  presetId: string | null;
}

interface ConfirmModalState {
  open: boolean;
  message: string;
  okLabel: string;
  cancelLabel: string;
  resolve: ((ok: boolean) => void) | null;
}

interface ModalStore {
  // Card Modal (Projects)
  cardModal: CardModalState;
  openCardModal: (cardId: string, projectBlockId: string) => void;
  closeCardModal: () => void;

  // ThreadsIntel Modal
  tiModal: TiModalState;
  openTiModal: (blockId: string, recordId?: string) => void;
  closeTiModal: () => void;

  // PromptedNotes Modal
  pnModal: PnModalState;
  openPnModal: (blockId: string, mode: "config" | "entry", entryId?: string) => void;
  closePnModal: () => void;

  // Spotify Modal
  spotifyModal: SpotifyModalState;
  openSpotifyModal: (blockId: string, presetId?: string) => void;
  closeSpotifyModal: () => void;

  // Confirm Dialog
  confirmModal: ConfirmModalState;
  openConfirmModal: (message: string, okLabel: string, cancelLabel: string) => Promise<boolean>;
  closeConfirmModal: () => void;
}

export const useModalStore = create<ModalStore>((set, get) => ({
  // Card Modal
  cardModal: {
    open: false,
    cardId: null,
    projectBlockId: null,
  },
  openCardModal: (cardId, projectBlockId) =>
    set({
      cardModal: {
        open: true,
        cardId,
        projectBlockId,
      },
    }),
  closeCardModal: () =>
    set({
      cardModal: {
        open: false,
        cardId: null,
        projectBlockId: null,
      },
    }),

  // ThreadsIntel Modal
  tiModal: {
    open: false,
    blockId: null,
    recordId: null,
  },
  openTiModal: (blockId, recordId) =>
    set({
      tiModal: {
        open: true,
        blockId,
        recordId: recordId || null,
      },
    }),
  closeTiModal: () =>
    set({
      tiModal: {
        open: false,
        blockId: null,
        recordId: null,
      },
    }),

  // PromptedNotes Modal
  pnModal: {
    open: false,
    blockId: null,
    mode: null,
    entryId: null,
  },
  openPnModal: (blockId, mode, entryId) =>
    set({
      pnModal: {
        open: true,
        blockId,
        mode,
        entryId: entryId || null,
      },
    }),
  closePnModal: () =>
    set({
      pnModal: {
        open: false,
        blockId: null,
        mode: null,
        entryId: null,
      },
    }),

  // Spotify Modal
  spotifyModal: {
    open: false,
    blockId: null,
    presetId: null,
  },
  openSpotifyModal: (blockId, presetId) =>
    set({
      spotifyModal: {
        open: true,
        blockId,
        presetId: presetId || null,
      },
    }),
  closeSpotifyModal: () =>
    set({
      spotifyModal: {
        open: false,
        blockId: null,
        presetId: null,
      },
    }),

  // Confirm Dialog
  confirmModal: {
    open: false,
    message: "",
    okLabel: "OK",
    cancelLabel: "Cancel",
    resolve: null,
  },
  openConfirmModal: (message, okLabel, cancelLabel) =>
    new Promise<boolean>((resolve) => {
      set({
        confirmModal: {
          open: true,
          message,
          okLabel,
          cancelLabel,
          resolve,
        },
      });
    }),
  closeConfirmModal: () => {
    const { confirmModal } = get();
    if (confirmModal.resolve) {
      confirmModal.resolve(false);
    }
    set({
      confirmModal: {
        open: false,
        message: "",
        okLabel: "OK",
        cancelLabel: "Cancel",
        resolve: null,
      },
    });
  },
}));
