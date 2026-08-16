import { create } from 'zustand';

export const DEFAULT_DEMO_MESSAGE =
  "You're exploring a view-only demo. Sign up and create your own project to run the pipeline and make changes.";

interface DemoToastState {
  visible: boolean;
  message: string;
  show: (message?: string) => void;
  hide: () => void;
}

/** Global, app-wide so any mutating-action handler (across every workspace
 * module) can trigger the same "view-only demo" message without each one
 * owning its own toast state. */
export const useDemoToastStore = create<DemoToastState>((set) => ({
  visible: false,
  message: DEFAULT_DEMO_MESSAGE,
  show: (message) => set({ visible: true, message: message || DEFAULT_DEMO_MESSAGE }),
  hide: () => set({ visible: false }),
}));
