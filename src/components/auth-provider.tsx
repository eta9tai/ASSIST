
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
    // This function runs when the component first loads.
    const storedAgentId = localStorage.getItem('agentId');
    setAgentIdState(storedAgentId);

    // Set up the listener for Firebase auth changes.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        // If user logs out, clear agentId from state and storage
        localStorage.removeItem('agentId');
        setAgentIdState(null);
      }
      // Regardless of user state, once this check is done, we are no longer loading.
      setLoading(false);
    });

    // Clean up the listener when the component is unmounted.
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

  // While the initial loading is true, we don't render the children
  // to prevent race conditions. Once loading is false, the app can render.
  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}
