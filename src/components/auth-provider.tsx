"use client";

import { useState, useEffect, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AuthContext } from "@/context/auth-context";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [agentId, setAgentIdState] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        // When auth state loads, also load agentId from localStorage
        const storedAgentId = localStorage.getItem('agentId');
        setAgentIdState(storedAgentId);
      } else {
        // Clear agentId on logout
        localStorage.removeItem('agentId');
        setAgentIdState(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const setAgentId = (id: string | null) => {
    if (id) {
      localStorage.setItem('agentId', id);
    } else {
      localStorage.removeItem('agentId');
    }
    setAgentIdState(id);
  };

  const value = { user, agentId, loading, setAgentId };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
