"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export function useTabPersistence<T extends string>(
  storageKey: string,
  defaultTab: T,
  validTabs: T[]
) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<T>(defaultTab);

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") as T;
    const tabFromStorage =
      typeof window !== "undefined"
        ? (localStorage.getItem(storageKey) as T)
        : null;

    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    } else if (tabFromStorage && validTabs.includes(tabFromStorage)) {
      setActiveTab(tabFromStorage);
    }
  }, [searchParams, storageKey, validTabs]);

  const handleTabChange = (tab: T) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, tab);
      const params = new URLSearchParams(window.location.search);
      params.set("tab", tab);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, "", newUrl);
    }
  };

  return [activeTab, handleTabChange] as const;
}
