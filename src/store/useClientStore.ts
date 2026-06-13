import { create } from 'zustand';
import { type Folder } from '../types/Types';
import { ClientService } from '../types/client';

interface ClientState {
  folders: Folder[];
  selectedFolder: Folder | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchFolders: () => Promise<void>;
  setSelectedFolder: (folder: Folder | null) => void;
  addFolder: (name: string) => Promise<void>;
  clearError: () => void;
}

export const useClientStore = create<ClientState>((set) => ({
  folders: [],
  selectedFolder: null,
  isLoading: false,
  error: null,

  setSelectedFolder: (folder: Folder | null) => set({ selectedFolder: folder }),
  
  clearError: () => set({ error: null }),

  fetchFolders: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await ClientService.getFolders();
      set({ folders: response.data });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  addFolder: async (name: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await ClientService.createFolder(name);
      set((state) => ({ folders: [...state.folders, response.data] }));
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },
}));
