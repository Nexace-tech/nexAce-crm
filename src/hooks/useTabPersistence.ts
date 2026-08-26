"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export function useTabPersistence<T extends string>(
  storageKey: string,
  defaultTab: T,
  validTabs: T[]
) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Consistent initial tab for both SSR and initial client hydration
  const getInitialTab = (): T => {
    const tabFromUrl = searchParams?.get("tab") as T;
    if (tabFromUrl && validTabs.includes(tabFromUrl)) return tabFromUrl;
    return defaultTab;
  };

  const [activeTab, setActiveTab] = useState<T>(getInitialTab);
  const mountedRef = useRef(false);

  // Sync from localStorage safely after hydration completes
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const tabFromUrl = searchParams?.get("tab") as T;
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
      return;
    }

    try {
      const tabFromStorage = localStorage.getItem(storageKey) as T;
      if (tabFromStorage && validTabs.includes(tabFromStorage)) {
        setActiveTab(tabFromStorage);
      }
    } catch {
      // Ignore storage errors
    }
  }, [storageKey, searchParams, validTabs]);

  const handleTabChange = useCallback((tab: T) => {
    setActiveTab(tab);
    try {
      localStorage.setItem(storageKey, tab);
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("tab") !== tab) {
          params.set("tab", tab);
          router.replace(`${pathname || window.location.pathname}?${params.toString()}`, { scroll: false });
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, [storageKey, router, pathname]);

  return [activeTab, handleTabChange] as const;
}

