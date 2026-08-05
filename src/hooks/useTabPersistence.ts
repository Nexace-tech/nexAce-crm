"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

export function useTabPersistence<T extends string>(
  storageKey: string,
  defaultTab: T,
  validTabs: T[]
) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Derive initial tab from URL or localStorage at first render — no effect needed
  const getInitialTab = (): T => {
    const tabFromUrl = searchParams.get("tab") as T;
    if (tabFromUrl && validTabs.includes(tabFromUrl)) return tabFromUrl;

    if (typeof window !== "undefined") {
      const tabFromStorage = localStorage.getItem(storageKey) as T;
      if (tabFromStorage && validTabs.includes(tabFromStorage)) return tabFromStorage;
    }
    return defaultTab;
  };

  const [activeTab, setActiveTab] = useState<T>(getInitialTab);

  const handleTabChange = (tab: T) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, tab);
      const params = new URLSearchParams(window.location.search);
      params.set("tab", tab);
      // Use router.replace to keep URL in sync without a full navigation
      router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    }
  };

  return [activeTab, handleTabChange] as const;
}
