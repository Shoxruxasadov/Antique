import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SAVED_COLLECTION_NAME = 'Saved';
export const LOCAL_SAVED_ID = 'local-saved';

function makeLocalId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const initialState = {
  localSnapHistory: [],
  localSavedCollection: {
    id: LOCAL_SAVED_ID,
    collection_name: SAVED_COLLECTION_NAME,
    antiques_ids: [],
  },
};

export const useLocalCollectionStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      addLocalScan: (antique, payload, imageUrl, imageBase64) => {
        const id = makeLocalId();
        const created_at = new Date().toISOString();
        const snap = {
          id,
          image_url: imageUrl || null,
          image_base64: imageBase64 || null,
          antique_id: id,
          payload: payload || {},
          created_at,
          antique: { ...antique, id },
        };
        set((state) => ({
          localSnapHistory: [snap, ...state.localSnapHistory],
          localSavedCollection: {
            ...state.localSavedCollection,
            antiques_ids: [id, ...(state.localSavedCollection.antiques_ids || [])],
          },
        }));
        return id;
      },

      getLocalSnapHistory: () => get().localSnapHistory,
      getLocalSavedCollection: () => get().localSavedCollection,

      removeLocalSnap: (snapId) => {
        set((state) => {
          const nextHistory = state.localSnapHistory.filter((s) => s.id !== snapId);
          const nextIds = (state.localSavedCollection.antiques_ids || []).filter((id) => id !== snapId);
          return {
            localSnapHistory: nextHistory,
            localSavedCollection: {
              ...state.localSavedCollection,
              antiques_ids: nextIds,
            },
          };
        });
      },

      clearLocalAfterSync: () => set(initialState),
    }),
    {
      name: 'antique-local-collection',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
