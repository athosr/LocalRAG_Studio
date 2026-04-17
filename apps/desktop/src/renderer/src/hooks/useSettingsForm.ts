import { defaultSettings, type AppSettings } from "@localrag/config";
import { useCallback, useMemo, useState } from "react";
import { useLocalragApi } from "../api/LocalragApiContext.js";

export function useSettingsForm(setError: (message: string | null) => void, setBusy: (busy: boolean) => void) {
  const api = useLocalragApi();
  const [draft, setDraft] = useState<AppSettings | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);

  const refreshSettings = useCallback(async () => {
    setError(null);
    try {
      const s = await api.getSettings();
      setDraft(s.settings);
      setHasApiKey(s.hasApiKey);
    } catch (e) {
      setDraft(defaultSettings());
      setHasApiKey(false);
      setError(
        `Could not load settings (${e instanceof Error ? e.message : String(e)}). Using defaults.`,
      );
    }
  }, [api, setError]);

  const onSaveSettings = useCallback(async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const payload: { settings: AppSettings; apiKey?: string | null } = {
        settings: draft,
      };
      if (apiKeyInput.trim().length > 0) payload.apiKey = apiKeyInput.trim();
      await api.setSettings(payload);
      setApiKeyInput("");
      await refreshSettings();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [api, apiKeyInput, draft, refreshSettings, setBusy, setError]);

  const onResetSettings = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await api.resetSettings();
      setApiKeyInput("");
      await refreshSettings();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [api, refreshSettings, setBusy, setError]);

  const onRefreshOllamaModels = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const models = await api.listOllamaModels();
      setOllamaModels(models);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [api, setBusy, setError]);

  const onClearApiKey = useCallback(async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      await api.setSettings({ settings: draft, apiKey: null });
      await refreshSettings();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [api, draft, refreshSettings, setBusy, setError]);

  const providerLabel = useMemo(() => {
    if (!draft) return "";
    return draft.activeProvider === "ollama" ? "Ollama (local)" : "Custom HTTP (OpenAI-compatible)";
  }, [draft]);

  return {
    draft,
    setDraft,
    hasApiKey,
    apiKeyInput,
    setApiKeyInput,
    ollamaModels,
    refreshSettings,
    onSaveSettings,
    onResetSettings,
    onRefreshOllamaModels,
    onClearApiKey,
    providerLabel,
  };
}
