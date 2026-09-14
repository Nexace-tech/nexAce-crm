"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Preloader } from "@/components/ui/Preloader";

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams?.get("tab");
    if (tab === "drive") {
      router.replace("/dashboard/clients?tab=drive");
    } else {
      router.replace("/dashboard/clients?tab=projects");
    }
  }, [router, searchParams]);

  return (
    <div className="flex h-96 w-full items-center justify-center">
      <Preloader label="Opening Projects & Drive in OPS Portal..." />
    </div>
  );
}
