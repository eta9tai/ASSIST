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
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // This effect runs after the component renders, preventing the "cannot update during render" error.
    // If auth is done loading and there's still no user, then we redirect.
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);


  // While loading, or if there is no user, show a loading spinner.
  // The useEffect above will handle the redirect.
  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If loading is finished and we have a user, render the children.
  return <>{children}</>;
}
