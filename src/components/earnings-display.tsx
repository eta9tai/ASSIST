
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, onSnapshot, query, doc, getDoc, where, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DollarSign, Wallet, History, Hourglass, Trash2, Loader2 } from "lucide-react";
import type { SalaryPayment } from "@/lib/types";

const CALL_RATE = 15; // 15 rupees per call

export default function EarningsDisplay() {
  const { agentId } = useAuth();
  const { toast } = useToast();
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [salaryPaid, setSalaryPaid] = useState(0);
  const [upcomingSalary, setUpcomingSalary] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

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

        const paymentsCollectionRef = collection(db, "salary", agentId, "payments");
        let salaryQuery = query(paymentsCollectionRef);
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

  const handleClearCallLog = async () => {
    if (!agentId) return;
    setIsDeleting(true);
    try {
      const callsQuery = query(collection(db, agentId));
      const callsSnapshot = await getDocs(callsQuery);
      
      if (callsSnapshot.empty) {
        toast({
          title: "No logs to clear",
          description: "Your call log is already empty.",
        });
        setIsDeleting(false);
        return;
      }

      const batch = writeBatch(db);
      callsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      toast({
        title: "Success!",
        description: `All your call logs have been permanently deleted.`,
      });
    } catch (error) {
       console.error("Error clearing call logs: ", error);
       toast({
        variant: "destructive",
        title: "Deletion Error",
        description: "Could not clear call logs. Please try again.",
      });
    } finally {
        setIsDeleting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Earnings & Salary</CardTitle>
        <div className="flex items-center gap-2">
          <AlertDialog>
              <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isDeleting}>
                       {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                       Clear Call Log
                  </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This action is permanent and cannot be undone. This will delete all your call log entries from the database, and your earnings will be reset to zero.
                  </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearCallLog} className="bg-destructive hover:bg-destructive/90">Confirm & Delete</AlertDialogAction>
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
