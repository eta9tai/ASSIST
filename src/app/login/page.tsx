"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInAnonymously } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Headset, Loader2, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { setAgentId } = useAuth();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleLogin = async (agent: 'ZN001' | 'ZN002') => {
    setIsLoading(agent);
    try {
      // Sign in anonymously to get a session
      await signInAnonymously(auth);
      
      // Set the selected agent ID in our auth context/local storage
      if (setAgentId) {
        setAgentId(agent);
      }
      
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Could not log in. Please try again.",
      });
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary text-primary-foreground rounded-full p-3 w-fit mb-4">
            <Headset className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Select Agent</CardTitle>
          <CardDescription>Choose your agent profile to log in</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            size="lg"
            className="w-full"
            onClick={() => handleLogin('ZN001')}
            disabled={!!isLoading}
          >
            {isLoading === 'ZN001' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <User className="mr-2 h-4 w-4" />
            )}
            Login as ZN001
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="w-full"
            onClick={() => handleLogin('ZN002')}
            disabled={!!isLoading}
          >
            {isLoading === 'ZN002' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <User className="mr-2 h-4 w-4" />
            )}
            Login as ZN002
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
