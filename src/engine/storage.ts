// The single storage seam (§2, §15). Every read/write of the save goes through
// here — nowhere else touches localStorage. Swapping this module for a Tauri
// file-system implementation is the ENTIRE "make it a desktop app" storage change.

export interface Storage {
  load(key: string): string | null;
  save(key: string, value: string): void;
  remove(key: string): void;
}

const webStorage: Storage = {
  load(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  save(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* quota / private-mode — saving is best-effort */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

// Later: `export const storage = isTauri() ? tauriStorage : webStorage;`
export const storage: Storage = webStorage;
