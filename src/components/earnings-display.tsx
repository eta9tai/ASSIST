
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, onSnapshot, query, doc, getDoc, where, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DollarSign, Wallet, History, Hourglass, RefreshCw } from "lucide-react";
import type { SalaryPayment } from "@/lib/types";

const CALL_RATE = 15; // 15 rupees per call

export default function EarningsDisplay() {
  const { agentId } = useAuth();
  const { toast } = useToast();
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [salaryPaid, setSalaryPaid] = useState(0);
  const [upcomingSalary, setUpcomingSalary] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (!agentId) {
      setIsLoading(true);
      return;
    }

    setIsLoading(true);

    const setupListeners = async () => {
      try {
        const metaDocRef = doc(db, "agentMetadata", agentId);
        const metaDoc = await getDoc(metaDocRef);
        const lastResetAt = metaDoc.exists() ? metaDoc.data().lastResetAt : null;

        let callsQuery = query(collection(db, agentId));
        if (lastResetAt) {
          callsQuery = query(callsQuery, where("createdAt", ">", lastResetAt));
        }
        
        const unsubscribeCalls = onSnapshot(callsQuery, (snapshot) => {
          const earnings = snapshot.size * CALL_RATE;
          setTotalEarnings(earnings);
          setIsLoading(false);
        }, (error) => {
          console.error("Error fetching calls for earnings:", error);
          setIsLoading(false);
        });

        let salaryQuery = query(
          collection(db, "salary", agentId, "payments"),
          where("status", "in", ["Credited", "Issued"])
        );
        if (lastResetAt) {
          salaryQuery = query(salaryQuery, where("date", ">", lastResetAt));
        }
        
        const unsubscribeSalary = onSnapshot(salaryQuery, (snapshot) => {
          let totalPaid = 0;
          let totalUpcoming = 0;
          snapshot.forEach((doc) => {
            const payment = doc.data() as SalaryPayment;
            if (payment.status === 'Credited') {
              totalPaid += payment.amount || 0;
            }
            if (payment.status === 'Issued') {
                totalUpcoming += payment.amount || 0;
            }
          });
          setSalaryPaid(totalPaid);
          setUpcomingSalary(totalUpcoming);
        }, (error) => {
            console.error("Error fetching salary:", error);
        });

        return () => {
          unsubscribeCalls();
          unsubscribeSalary();
        };
      } catch (error) {
        console.error("Error setting up listeners:", error);
        setIsLoading(false);
      }
    };

    const unsubscribePromise = setupListeners();
    
    return () => {
      unsubscribePromise.then(cleanup => cleanup && cleanup());
    };

  }, [agentId]);

  const handleResetEarnings = async () => {
    if (!agentId) return;
    setIsResetting(true);
    try {
      const metaDocRef = doc(db, "agentMetadata", agentId);
      await setDoc(metaDocRef, { lastResetAt: serverTimestamp() }, { merge: true });
       toast({
        title: "Earnings Reset!",
        description: `Your earnings display has been reset to zero.`,
      });
    } catch (error) {
       console.error("Error resetting earnings: ", error);
       toast({
        variant: "destructive",
        title: "Reset Error",
        description: "Could not reset earnings. Please try again.",
      });
    } finally {
        setIsResetting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Earnings & Salary</CardTitle>
        <div className="flex items-center gap-2">
          <AlertDialog>
              <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isResetting}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Reset Earnings
                  </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This will reset your displayed earnings to zero. All your previous call logs will be kept, but the earnings calculation will start over from now. This action cannot be undone.
                  </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetEarnings}>Confirm Reset</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/salary-log">
              <History className="mr-2 h-4 w-4" />
              View Salary Log
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex items-center space-x-4 rounded-md border p-4">
            <div className="flex-shrink-0 bg-primary text-primary-foreground rounded-full p-3">
                <DollarSign className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                Total Earnings (Since Last Reset)
                </p>
                {isLoading ? (
                    <Skeleton className="h-6 w-24" />
                ) : (
                    <p className="text-2xl font-bold">₹{totalEarnings.toLocaleString()}</p>
                )}
            </div>
        </div>
         <div className="flex items-center space-x-4 rounded-md border p-4">
            <div className="flex-shrink-0 bg-secondary text-secondary-foreground rounded-full p-3">
                <Hourglass className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                Upcoming Salary (Issued)
                </p>
                 {isLoading ? (
                    <Skeleton className="h-6 w-24" />
                ) : (
                    <p className="text-2xl font-bold">₹{upcomingSalary.toLocaleString()}</p>
                )}
            </div>
        </div>
        <div className="flex items-center space-x-4 rounded-md border p-4">
            <div className="flex-shrink-0 bg-accent text-accent-foreground rounded-full p-3">
                <Wallet className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                Total Salary Credited (Since Last Reset)
                </p>
                 {isLoading ? (
                    <Skeleton className="h-6 w-24" />
                ) : (
                    <p className="text-2xl font-bold">₹{salaryPaid.toLocaleString()}</p>
                )}
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
