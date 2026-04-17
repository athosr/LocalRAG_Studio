import { createContext, useContext, type ReactNode } from "react";
import type { LocalragApi } from "./types.js";

const LocalragApiContext = createContext<LocalragApi | null>(null);

export function LocalragApiProvider({ value, children }: { value: LocalragApi; children: ReactNode }) {
  return <LocalragApiContext.Provider value={value}>{children}</LocalragApiContext.Provider>;
}

export function useLocalragApi(): LocalragApi {
  const ctx = useContext(LocalragApiContext);
  if (!ctx) {
    throw new Error("useLocalragApi must be used within LocalragApiProvider");
  }
  return ctx;
}
