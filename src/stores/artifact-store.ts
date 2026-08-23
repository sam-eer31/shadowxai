import { create } from 'zustand';

export interface ArtifactMeta {
  filename: string;
  extension: string;
  language: string;
  version?: number;
}

interface ArtifactState {
  artifacts: Record<string, ArtifactMeta>;
  addArtifact: (id: string, filename: string, extension: string, language: string, version?: number) => void;
  updateArtifact: (id: string, updates: Partial<ArtifactMeta>) => void;
  getArtifact: (id: string) => ArtifactMeta | undefined;
}

export const useArtifactStore = create<ArtifactState>((set, get) => ({
  artifacts: {},
  addArtifact: (id, filename, extension, language, version) => {
    set((state) => ({
      artifacts: {
        ...state.artifacts,
        [id]: { filename, extension, language, version },
      },
    }));
  },
  updateArtifact: (id, updates) => {
    set((state) => {
      const existing = state.artifacts[id];
      if (!existing) return state;
      return {
        artifacts: {
          ...state.artifacts,
          [id]: { ...existing, ...updates },
        },
      };
    });
  },
  getArtifact: (id) => {
    return get().artifacts[id];
  },
}));
