"use client";

import { useEffect, useState, startTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export function useTabPersistence<T extends string>(
  storageKey: string,
  defaultTab: T,
  validTabs: T[]
) {
  const searchParams = useSearchParams();
  const router = useRouter();
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
    startTransition(() => {
      setActiveTab(tab);
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, tab);
      }
      const params = new URLSearchParams(window.location.search);
      params.set("tab", tab);
      router.replace(`${window.location.pathname}?${params.toString()}`, {
        scroll: false,
      });
    });
  };

  return [activeTab, handleTabChange] as const;
}
