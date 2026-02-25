import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WELCOME_MSG = {
  id: 'welcome',
  role: 'assistant',
  text: 'Hello! How can I help you about antique items?',
  timestamp: new Date().toISOString(),
};

export const useAssistantStore = create(
  persist(
    (set) => ({
      messages: [WELCOME_MSG],

      addMessage: (msg) =>
        set((s) => ({ messages: [...s.messages, { ...msg, id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2)}` }] })),

      setMessages: (messages) => set({ messages }),

      clearChat: () => set({ messages: [WELCOME_MSG] }),
    }),
    {
      name: 'antique-assistant-chat',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
