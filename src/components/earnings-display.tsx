
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, onSnapshot, query, doc, getDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DollarSign, Wallet, History, Hourglass } from "lucide-react";
import type { SalaryPayment } from "@/lib/types";

const CALL_RATE = 15; // 15 rupees per call

export default function EarningsDisplay() {
  const { agentId } = useAuth();
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [salaryPaid, setSalaryPaid] = useState(0);
  const [upcomingSalary, setUpcomingSalary] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!agentId) {
      setIsLoading(true);
      return;
    }

    setIsLoading(true);

    const setupListeners = async () => {
      // Fetch the last reset timestamp for the agent
      const metaDocRef = doc(db, "agentMetadata", agentId);
      const metaDoc = await getDoc(metaDocRef);
      const lastResetAt = metaDoc.exists() ? metaDoc.data().lastResetAt : null;

      // Listener for call entries to calculate earnings
      let callsQuery = query(collection(db, agentId));
      if (lastResetAt) {
        // If a reset date exists, only get calls created after that date
        callsQuery = query(callsQuery, where("createdAt", ">", lastResetAt));
      }
      
      const unsubscribeCalls = onSnapshot(callsQuery, (snapshot) => {
        const earnings = snapshot.size * CALL_RATE;
        setTotalEarnings(earnings);
        setIsLoading(false); // Set loading to false after first calculation
      }, (error) => {
        console.error("Error fetching calls for earnings:", error);
        setIsLoading(false);
      });

      // Listener for salary payments
      let salaryQuery = query(
        collection(db, "salary", agentId, "payments"),
        where("status", "in", ["Credited", "Issued"])
      );
      if (lastResetAt) {
        // If a reset date exists, only get payments made after that date
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
          setSalaryPaid(0);
          setUpcomingSalary(0);
      });

      return () => {
        unsubscribeCalls();
        unsubscribeSalary();
      };
    };

    const unsubscribePromise = setupListeners();
    
    return () => {
      unsubscribePromise.then(cleanup => cleanup && cleanup());
    };

  }, [agentId]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Earnings & Salary</CardTitle>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/salary-log">
            <History className="mr-2 h-4 w-4" />
            View Salary Log
          </Link>
        </Button>
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
