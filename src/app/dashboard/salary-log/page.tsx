
"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import type { SalaryPayment } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function SalaryLogPage() {
  const { agentId, loading: authLoading } = useAuth();
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If auth is still loading, do nothing and show skeleton.
    if (authLoading) {
      setIsLoading(true);
      return;
    }

    // If auth is done but there is no agentId, stop loading and show empty state.
    if (!agentId) {
      setIsLoading(false);
      return;
    }

    // If we have an agentId, start listening for data.
    setIsLoading(true);
    const paymentsQuery = query(
      collection(db, "salary", agentId, "payments"),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(
      paymentsQuery,
      (snapshot) => {
        const paymentData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SalaryPayment[];
        setPayments(paymentData);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching salary log:", error);
        setIsLoading(false);
      }
    );

    // Cleanup the listener when the component unmounts or agentId changes.
    return () => unsubscribe();
  }, [agentId, authLoading]); // Effect depends on both agentId and authLoading status.

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Dashboard</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Salary Log</h1>
          <p className="text-muted-foreground">A detailed history of all payments received.</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Payment History ({agentId || '...'})</CardTitle>
          <CardDescription>
            This log shows all individual salary payments and advances.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : payments.length > 0 ? (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {payment.date?.toDate().toLocaleDateString() || 'N/A'}
                    </TableCell>
                    <TableCell className="font-medium">{payment.purpose}</TableCell>
                    <TableCell className="text-right font-mono">
                      ₹{payment.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No salary payments found for this agent.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
