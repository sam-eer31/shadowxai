import { create } from 'zustand';

interface ArtifactState {
  artifacts: Record<string, { filename: string; extension: string; language: string }>;
  addArtifact: (id: string, filename: string, extension: string, language: string) => void;
  getArtifact: (id: string) => { filename: string; extension: string; language: string } | undefined;
}

export const useArtifactStore = create<ArtifactState>((set, get) => ({
  artifacts: {},
  addArtifact: (id, filename, extension, language) => {
    set((state) => ({
      artifacts: {
        ...state.artifacts,
        [id]: { filename, extension, language },
      },
    }));
  },
  getArtifact: (id) => {
    return get().artifacts[id];
  },
}));
