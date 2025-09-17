
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
const AGENT_SECRET_CODES: Record<string, string> = {
  ZN001: "0",
  ZN002: "2025",
};
const PRE_LOGIN_KEY = "preLoginAuthenticated";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, agentId, setAgentId, loading } = useAuth();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  
  // State for Admin Login Dialog
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [adminSecretCode, setAdminSecretCode] = useState("");
  const [adminSecretCodeError, setAdminSecretCodeError] = useState("");

  // State for Agent Login Dialog
  const [isAgentLoginOpen, setIsAgentLoginOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<'ZN001' | 'ZN002' | null>(null);
  const [agentSecretCode, setAgentSecretCode] = useState("");
  const [agentSecretCodeError, setAgentSecretCodeError] = useState("");

  const [isCheckingPreLogin, setIsCheckingPreLogin] = useState(true);

  useEffect(() => {
      if (sessionStorage.getItem(PRE_LOGIN_KEY) !== 'true') {
          router.replace('/');
      } else {
          setIsCheckingPreLogin(false);
      }
  }, [router]);
  
  useEffect(() => {
    // If done loading and pre-login is passed, check for authentication status and redirect if necessary.
    if (!loading && !isCheckingPreLogin) {
      if (user && agentId) {
        router.replace("/dashboard");
      } else if (user && sessionStorage.getItem('isAdminAuthenticated') === 'true') {
        router.replace('/admin/dashboard');
      }
    }
  }, [user, agentId, loading, router, isCheckingPreLogin]);

  const openAgentLoginDialog = (agent: 'ZN001' | 'ZN002') => {
    setSelectedAgent(agent);
    setAgentSecretCode("");
    setAgentSecretCodeError("");
    setIsAgentLoginOpen(true);
  };

  const handleAgentLogin = async () => {
    if (!selectedAgent) return;
    setAgentSecretCodeError("");

    if (agentSecretCode === AGENT_SECRET_CODES[selectedAgent]) {
      setIsLoading(selectedAgent);
      try {
        const userCredential = await signInAnonymously(auth);
        if (setAgentId) {
          setAgentId(selectedAgent);
        }
        setIsAgentLoginOpen(false);
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
    } else {
      setAgentSecretCodeError("Invalid secret code. Please try again.");
    }
  };
  
  const handleAdminLogin = async () => {
    setAdminSecretCodeError("");
    if (adminSecretCode === ADMIN_SECRET_CODE) {
      setIsLoading('admin');
      try {
        await signInAnonymously(auth);
        sessionStorage.setItem('isAdminAuthenticated', 'true');
        setIsAdminLoginOpen(false);
        // No need to push, the useEffect will handle the redirect.
      } catch (error) {
         toast({
          variant: "destructive",
          title: "Admin Login Failed",
          description: "Could not start an admin session. Please try again.",
        });
         setIsLoading(null);
      }
    } else {
      setAdminSecretCodeError("Invalid secret code. Please try again.");
    }
  };

  if (loading || isCheckingPreLogin) {
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
              onClick={() => openAgentLoginDialog('ZN001')}
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
              onClick={() => openAgentLoginDialog('ZN002')}
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

      {/* Agent Login Dialog */}
      <AlertDialog open={isAgentLoginOpen} onOpenChange={setIsAgentLoginOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Agent Authentication</AlertDialogTitle>
            <AlertDialogDescription>
              Please enter the secret code for Agent {selectedAgent}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="agent-secret-code">Secret Code</Label>
            <Input
              id="agent-secret-code"
              type="password"
              placeholder="Enter your code"
              value={agentSecretCode}
              onChange={(e) => setAgentSecretCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAgentLogin()}
            />
             {agentSecretCodeError && <p className="text-sm font-medium text-destructive">{agentSecretCodeError}</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAgentLogin} disabled={isLoading === selectedAgent}>
              {isLoading === selectedAgent ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Authenticate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Admin Login Dialog */}
      <AlertDialog open={isAdminLoginOpen} onOpenChange={setIsAdminLoginOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Admin Authentication</AlertDialogTitle>
            <AlertDialogDescription>
              Please enter the Finance Admin secret code to proceed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="admin-secret-code">Secret Code</Label>
            <Input
              id="admin-secret-code"
              type="password"
              placeholder="Enter your code"
              value={adminSecretCode}
              onChange={(e) => setAdminSecretCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
            />
             {adminSecretCodeError && <p className="text-sm font-medium text-destructive">{adminSecretCodeError}</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAdminSecretCode('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAdminLogin} disabled={isLoading === 'admin'}>
              {isLoading === 'admin' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Authenticate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
