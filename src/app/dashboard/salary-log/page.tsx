
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
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

export default function SalaryLogPage() {
  const { agentId, loading: authLoading } = useAuth();
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return; 
    }
    if (!agentId) {
      setIsLoading(false);
      return;
    }

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

    return () => unsubscribe();
  }, [agentId, authLoading]);

  const getStatusVariant = (status: string | undefined) => {
    switch (status) {
      case 'Credited':
        return 'default';
      case 'Issued':
        return 'secondary';
      case 'Cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

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
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-6 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : payments.length > 0 ? (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {payment.date?.toDate().toLocaleDateString() || 'N/A'}
                    </TableCell>
                    <TableCell className="font-medium">{payment.purpose}</TableCell>
                    <TableCell className="font-mono">
                      ₹{payment.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={getStatusVariant(payment.status)}>
                        {payment.status || 'Issued'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
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
