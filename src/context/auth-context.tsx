
"use client";

import { createContext } from "react";
import type { User } from "firebase/auth";

export interface AuthContextType {
  user: User | null;
  agentId: string | null;
  loading: boolean;
  setAgentId?: (id: string | null) => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  agentId: null,
  loading: true,
});
