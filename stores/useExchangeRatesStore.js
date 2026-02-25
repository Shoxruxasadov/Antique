import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RATES_API = 'https://api.exchangerate-api.com/v4/latest/USD';
const CACHE_HOURS = 24;

function isStale(timestamp) {
  if (!timestamp) return true;
  return (Date.now() - timestamp) / (1000 * 60 * 60) > CACHE_HOURS;
}

export const useExchangeRatesStore = create(
  persist(
    (set, get) => ({
      rates: null,
      lastFetched: null,
      loading: false,
      error: null,

      fetchRates: async () => {
        const { rates, lastFetched } = get();
        if (rates && !isStale(lastFetched)) return rates;
        set({ loading: true, error: null });
        try {
          const res = await fetch(RATES_API);
          const data = await res.json();
          const ratesMap = data?.rates || null;
          set({ rates: ratesMap, lastFetched: Date.now(), loading: false, error: null });
          return ratesMap;
        } catch (e) {
          set({ error: e?.message || 'Failed to load rates', loading: false });
          return get().rates;
        }
      },

      getRate: (currencyCode) => {
        const { rates } = get();
        if (!rates || !currencyCode) return 1;
        if (currencyCode === 'USD') return 1;
        return rates[currencyCode] ?? 1;
      },
    }),
    {
      name: 'antique-exchange-rates',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ rates: state.rates, lastFetched: state.lastFetched }),
    }
  )
);
