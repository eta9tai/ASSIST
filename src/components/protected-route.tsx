
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, agentId, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !agentId)) {
      router.replace("/login");
    }
  }, [user, agentId, loading, router]);

  if (loading || !user || !agentId) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
