
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DollarSign, Wallet, History } from "lucide-react";
import type { SalaryPayment } from "@/lib/types";

const CALL_RATE = 15; // 15 rupees per call

export default function EarningsDisplay() {
  const { agentId } = useAuth();
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [salaryPaid, setSalaryPaid] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!agentId) {
      setIsLoading(true);
      return;
    }

    setIsLoading(true);

    // Listener for call entries to calculate earnings
    const callsQuery = collection(db, agentId);
    const unsubscribeCalls = onSnapshot(callsQuery, (snapshot) => {
      const earnings = snapshot.size * CALL_RATE;
      setTotalEarnings(earnings);
    }, (error) => {
      console.error("Error fetching calls for earnings:", error);
      // Even if calls fail, we might still get salary
    });

    // Listener for salary payments
    const salaryQuery = query(collection(db, "salary", agentId, "payments"));
    const unsubscribeSalary = onSnapshot(salaryQuery, (snapshot) => {
      let totalPaid = 0;
      snapshot.forEach((doc) => {
        const payment = doc.data() as SalaryPayment;
        totalPaid += payment.amount || 0;
      });
      setSalaryPaid(totalPaid);
      setIsLoading(false); // Stop loading after salary is fetched
    }, (error) => {
        console.error("Error fetching salary:", error);
        setSalaryPaid(0); // Assume 0 if there's an error
        setIsLoading(false);
    });

    // Cleanup listeners on unmount or when agentId changes
    return () => {
      unsubscribeCalls();
      unsubscribeSalary();
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
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex items-center space-x-4 rounded-md border p-4">
            <div className="flex-shrink-0 bg-primary text-primary-foreground rounded-full p-3">
                <DollarSign className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                Total Earnings (Till Now)
                </p>
                {isLoading ? (
                    <Skeleton className="h-6 w-24" />
                ) : (
                    <p className="text-2xl font-bold">₹{totalEarnings.toLocaleString()}</p>
                )}
            </div>
        </div>
        <div className="flex items-center space-x-4 rounded-md border p-4">
            <div className="flex-shrink-0 bg-accent text-accent-foreground rounded-full p-3">
                <Wallet className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                Total Salary Paid
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
