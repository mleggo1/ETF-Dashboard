import React, { useEffect, useState, createContext } from "react";
import { Dashboard } from "./components/Dashboard";
import etfConfig from "./data/etfs.json";

export const AppContext = createContext();

export default function App() {
  const [globalTimeframe, setGlobalTimeframe] = useState("YTD");
  const [etfData, setEtfData] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const today = new Date();
    const isoToday = today.toISOString().slice(0, 10);
    const makeSeries = (symbol) => {
      const prices = [];
      const start = new Date();
      start.setFullYear(start.getFullYear() - 3);
      let price = 50 + Math.random() * 30;
      for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
        price = price * (1 + (Math.random() - 0.5) / 200);
        prices.push({ date: d.toISOString().slice(0, 10), close: Number(price.toFixed(2)) });
      }
      return { symbol, lastUpdated: isoToday, prices };
    };
    const built = {};
    etfConfig.forEach((etf) => { built[etf.symbol] = makeSeries(etf.symbol); });
    setEtfData(built);
    setLastUpdated(isoToday);
  }, []);

  return (
    <AppContext.Provider value={{ globalTimeframe, setGlobalTimeframe, etfData, ETF_CONFIG: etfConfig, lastUpdated }}>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Dashboard />
      </div>
    </AppContext.Provider>
  );
}