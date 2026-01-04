import { useState, useEffect, useCallback } from "react";

const DEV_UNLOCK_KEY = "ferunda_dev_unlock";
const DEV_MODE_EVENT = "ferunda-dev-mode-change";

export function useDevMode() {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DEV_UNLOCK_KEY) === "true";
  });

  // Listen for changes from other components/tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === DEV_UNLOCK_KEY) {
        setIsEnabled(e.newValue === "true");
      }
    };

    const handleCustomEvent = () => {
      setIsEnabled(localStorage.getItem(DEV_UNLOCK_KEY) === "true");
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(DEV_MODE_EVENT, handleCustomEvent);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(DEV_MODE_EVENT, handleCustomEvent);
    };
  }, []);

  const setDevUnlock = useCallback((enabled: boolean) => {
    localStorage.setItem(DEV_UNLOCK_KEY, enabled ? "true" : "false");
    setIsEnabled(enabled);
    window.dispatchEvent(new CustomEvent(DEV_MODE_EVENT));
  }, []);

  const toggleDevUnlock = useCallback(() => {
    setDevUnlock(!isEnabled);
  }, [isEnabled, setDevUnlock]);

  const isDevUnlockEnabled = useCallback(() => {
    return isEnabled;
  }, [isEnabled]);

  return {
    isDevUnlockEnabled,
    isEnabled,
    setDevUnlock,
    toggleDevUnlock,
  };
}

export default useDevMode;
