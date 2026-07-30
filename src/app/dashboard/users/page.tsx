"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Preloader } from "@/components/ui/Preloader";

export default function UsersRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/settings?tab=users");
  }, [router]);

  return <Preloader label="Redirecting to Settings > User Management..." />;
}
