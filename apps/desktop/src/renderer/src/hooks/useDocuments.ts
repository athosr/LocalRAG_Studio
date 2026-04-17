import { useCallback, useState } from "react";
import { useLocalragApi } from "../api/LocalragApiContext.js";
import type { DocumentRow } from "../api/types.js";

export function useDocuments(
  setError: (message: string | null) => void,
  setBusy: (busy: boolean) => void,
) {
  const api = useLocalragApi();
  const [docs, setDocs] = useState<DocumentRow[]>([]);

  const refreshDocs = useCallback(async () => {
    setError(null);
    try {
      const rows = await api.listDocuments();
      setDocs(rows);
    } catch (e) {
      setDocs([]);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [api, setError]);

  const deleteDocument = useCallback(
    async (id: string) => {
      setBusy(true);
      setError(null);
      try {
        await api.deleteDocument(id);
        await refreshDocs();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [api, refreshDocs, setBusy, setError],
  );

  return { docs, refreshDocs, deleteDocument };
}
