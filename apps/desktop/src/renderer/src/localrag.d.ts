import type { LocalragApi } from "./api/types.js";

declare global {
  interface Window {
    localrag: LocalragApi;
  }
}

export {};
