
"use client";

import { useState, useEffect } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Headset, Loader2, User, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const ADMIN_SECRET_CODE = "BPCS2030";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, agentId, setAgentId, loading } = useAuth();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [secretCode, setSecretCode] = useState("");
  const [secretCodeError, setSecretCodeError] = useState("");
  
  useEffect(() => {
    // If done loading, check for authentication status and redirect if necessary.
    if (!loading) {
      if (user && agentId) {
        router.replace("/dashboard");
      } else if (user && sessionStorage.getItem('isAdminAuthenticated') === 'true') {
        router.replace('/admin/dashboard');
      }
    }
  }, [user, agentId, loading, router]);


  const handleAgentLogin = async (agent: 'ZN001' | 'ZN002') => {
    setIsLoading(agent);
    try {
      const userCredential = await signInAnonymously(auth);
      if (setAgentId) {
        setAgentId(agent);
      }
      // No need to push, the useEffect will handle the redirect.
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Could not log in. Please try again.",
      });
      setIsLoading(null);
    }
  };
  
  const handleAdminLogin = async () => {
    setSecretCodeError("");
    if (secretCode === ADMIN_SECRET_CODE) {
      setIsLoading('admin');
      try {
        await signInAnonymously(auth);
        sessionStorage.setItem('isAdminAuthenticated', 'true');
        // No need to push, the useEffect will handle the redirect.
        setIsAdminLoginOpen(false);
      } catch (error) {
         toast({
          variant: "destructive",
          title: "Admin Login Failed",
          description: "Could not start an admin session. Please try again.",
        });
         setIsLoading(null);
      }
    } else {
      setSecretCodeError("Invalid secret code. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary text-primary-foreground rounded-full p-3 w-fit mb-4">
              <Headset className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Select Profile</CardTitle>
            <CardDescription>Choose your profile to log in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              size="lg"
              className="w-full"
              onClick={() => handleAgentLogin('ZN001')}
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
              onClick={() => handleAgentLogin('ZN002')}
              disabled={!!isLoading}
            >
              {isLoading === 'ZN002' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <User className="mr-2 h-4 w-4" />
              )}
              Login as ZN002
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>
            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={() => setIsAdminLoginOpen(true)}
              disabled={!!isLoading}
            >
               {isLoading === 'admin' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 h-4 w-4" />
              )}
              Finance Admin
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={isAdminLoginOpen} onOpenChange={setIsAdminLoginOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Admin Authentication</AlertDialogTitle>
            <AlertDialogDescription>
              Please enter the Finance Admin secret code to proceed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="secret-code">Secret Code</Label>
            <Input
              id="secret-code"
              type="password"
              placeholder="Enter your code"
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
            />
             {secretCodeError && <p className="text-sm font-medium text-destructive">{secretCodeError}</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSecretCode('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAdminLogin} disabled={isLoading === 'admin'}>
              {isLoading === 'admin' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Authenticate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
