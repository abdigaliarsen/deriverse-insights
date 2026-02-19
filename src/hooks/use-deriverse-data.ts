import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchAllInstruments,
  fetchOrderBook,
  getMockMarketData,
  getMockOrderBook,
  InstrumentInfo,
  OrderBookData,
} from "@/lib/deriverse-client";

export interface DeriverseDataState {
  instruments: InstrumentInfo[];
  selectedInstrument: string;
  setSelectedInstrument: (id: string) => void;
  orderBook: OrderBookData;
  isLive: boolean;
  isLoading: boolean;
  lastUpdated: Date | null;
  error: string | null;
}

export function useDeriverseData(): DeriverseDataState {
  const [instruments, setInstruments] = useState<InstrumentInfo[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<string>("0");
  const [orderBook, setOrderBook] = useState<OrderBookData>({ bids: [], asks: [], midPrice: 0, spread: 0 });
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await fetchAllInstruments();
      if (data.length > 0) {
        setInstruments(data);
        setIsLive(true);
        setError(null);
      } else {
        // Devnet returned empty, use mock
        setInstruments(getMockMarketData());
        setIsLive(false);
      }
    } catch {
      // Devnet unavailable, use mock
      setInstruments(getMockMarketData());
      setIsLive(false);
      setError("Devnet unavailable — showing mock data");
    }
    setLastUpdated(new Date());
    setIsLoading(false);
  }, []);

  const fetchOB = useCallback(async (instrId: string) => {
    try {
      if (isLive) {
        const ob = await fetchOrderBook(instrId);
        if (ob.bids.length > 0 || ob.asks.length > 0) {
          setOrderBook(ob);
          return;
        }
      }
      setOrderBook(getMockOrderBook());
    } catch {
      setOrderBook(getMockOrderBook());
    }
  }, [isLive]);

  // Initial fetch + polling
  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  // Fetch order book when instrument changes
  useEffect(() => {
    fetchOB(selectedInstrument);
  }, [selectedInstrument, fetchOB]);

  return {
    instruments,
    selectedInstrument,
    setSelectedInstrument,
    orderBook,
    isLive,
    isLoading,
    lastUpdated,
    error,
  };
}
