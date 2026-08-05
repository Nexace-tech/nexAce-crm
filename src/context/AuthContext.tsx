"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: "Admin" | "OPS" | "Manager" | "HR" | "Employee";
  tenantId: {
    _id: string;
    name: string;
    slug: string;
  };
  department?: string;
  status?: string;
  skills?: string[];
  bio?: string;
  phone?: string;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    website?: string;
    instagram?: string;
    facebook?: string;
  };
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  // check the session is valid or not
  // if not valid redirect to the login page
  // if valid set the user
  const fetchUser = useCallback(async () => {
    const executeFetch = async (retried = false): Promise<void> => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setUser(data.user);
            return;
          }
        }

        if (!retried) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          return await executeFetch(true);
        }

        setUser(null);
        if (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard")) {
          router.push("/login");
        }
      } catch (error) {
        console.error("Error fetching user session:", error);
        if (!retried) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          return await executeFetch(true);
        }
        setUser(null);
        if (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard")) {
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    await executeFetch();
  }, [router]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const logout = async () => {
    setLoading(true);
    try {
      await logoutAction();
      setUser(null);
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
