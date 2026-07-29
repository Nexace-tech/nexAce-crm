"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: "Admin" | "Manager" | "Employee";
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
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
        if (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard")) {
          router.push("/login");
        }
      }
    } catch (error) {
      console.error("Error fetching user session:", error);
      setUser(null);
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard")) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
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
