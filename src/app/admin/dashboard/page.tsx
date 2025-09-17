
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, getDocs, doc, updateDoc, writeBatch, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { SalaryPayment } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlusCircle, CheckCircle, Wallet } from "lucide-react";

const salaryFormSchema = z.object({
  agentId: z.enum(["ZN001", "ZN002"], { required_error: "You must select an agent." }),
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }).optional(),
  purpose: z.string().min(3, { message: "Purpose must be at least 3 characters long." }),
  settleAccount: z.boolean().default(false),
}).refine(data => data.settleAccount || (data.amount && data.amount > 0), {
    message: "Amount is required unless you are settling the account.",
    path: ["amount"],
});

const fundsFormSchema = z.object({
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }),
});

const CALL_RATE = 15;
const MAX_NEGATIVE_FUNDS = -200000;

function AgentPaymentHistory({ agentId, companyFunds }: { agentId: "ZN001" | "ZN002", companyFunds: number | null }) {
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const paymentsQuery = query(
      collection(db, "salary", agentId, "payments"),
      orderBy("date", "desc")
    );
    const unsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
      const paymentData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SalaryPayment[];
      setPayments(paymentData);
      setIsLoading(false);
    }, (error) => {
      console.error(`Error fetching payments for ${agentId}:`, error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [agentId]);

  const handleMarkAsCredited = async (payment: SalaryPayment) => {
    if (companyFunds === null) {
        toast({
            variant: "destructive",
            title: "Fund Error",
            description: "Could not verify company funds. Please try again.",
        });
        return;
    }

    setIsUpdating(payment.id);
    try {
      const fundsDocRef = doc(db, "company", "funds");
      const paymentDocRef = doc(db, "salary", agentId, "payments", payment.id);
      
      const batch = writeBatch(db);

      // 1. Update the payment status
      batch.update(paymentDocRef, { status: "Credited" });
      
      // 2. Decrement the company funds
      batch.update(fundsDocRef, { balance: increment(-payment.amount) });
      
      await batch.commit();

      toast({
        title: "Success",
        description: "Payment status updated to Credited and funds deducted.",
      });
    } catch (error) {
      console.error("Error in crediting transaction:", error);
      toast({
        variant: "destructive",
        title: "Update Error",
        description: "Could not update the payment status. Please try again.",
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const getStatusVariant = (status: string | undefined) => {
    switch (status) {
      case 'Credited':
        return 'default';
      case 'Issued':
        return 'secondary';
      default:
        return 'outline';
    }
  };


  return (
     <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Purpose</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin" />
              </TableCell>
            </TableRow>
          ) : payments.length > 0 ? (
            payments.map(payment => {
                const isCreditable = companyFunds !== null && (companyFunds - payment.amount) >= MAX_NEGATIVE_FUNDS;
                return (
                  <TableRow key={payment.id}>
                    <TableCell>{payment.date?.toDate().toLocaleDateString() || 'N/A'}</TableCell>
                    <TableCell className="font-medium">{payment.purpose}</TableCell>
                    <TableCell className="font-mono">₹{payment.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(payment.status)}>
                        {payment.status || 'Issued'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {payment.status !== 'Credited' && (
                         <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAsCredited(payment)}
                          disabled={isUpdating === payment.id || !isCreditable}
                          title={!isCreditable ? "Insufficient company funds to credit this payment." : ""}
                        >
                          {isUpdating === payment.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="mr-2 h-4 w-4" />
                          )}
                          Mark as Credited
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
            })
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No payments found for this agent.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
  )
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSalaryDialogOpen, setIsSalaryDialogOpen] = useState(false);
  const [isFundsDialogOpen, setIsFundsDialogOpen] = useState(false);
  const [companyFunds, setCompanyFunds] = useState<number | null>(null);

  useEffect(() => {
    const isAdmin = sessionStorage.getItem('isAdminAuthenticated');
    if (isAdmin !== 'true') {
      router.replace('/login');
    } else {
      setIsCheckingAuth(false);
    }
  }, [router]);

  useEffect(() => {
    const fundsDocRef = doc(db, "company", "funds");
    const unsubscribe = onSnapshot(fundsDocRef, (doc) => {
        if (doc.exists()) {
            setCompanyFunds(doc.data().balance);
        } else {
            setCompanyFunds(0); // If document doesn't exist, assume 0
        }
    }, (error) => {
        console.error("Error fetching company funds:", error);
        setCompanyFunds(null);
    });
    return () => unsubscribe();
  }, []);

  const salaryForm = useForm<z.infer<typeof salaryFormSchema>>({
    resolver: zodResolver(salaryFormSchema),
    defaultValues: {
      purpose: "",
      settleAccount: false
    },
  });

  const fundsForm = useForm<z.infer<typeof fundsFormSchema>>({
    resolver: zodResolver(fundsFormSchema),
    defaultValues: {
      amount: undefined,
    }
  });

  const watchSettleAccount = salaryForm.watch("settleAccount");

  async function onSalarySubmit(values: z.infer<typeof salaryFormSchema>) {
    setIsLoading(true);
    try {
      let paymentAmount = values.amount || 0;
      let paymentPurpose = values.purpose;

      if (values.settleAccount) {
        const callsQuery = query(collection(db, values.agentId));
        const callsSnapshot = await getDocs(callsQuery);
        const totalEarnings = callsSnapshot.size * CALL_RATE;
        
        const salaryQuery = query(collection(db, "salary", values.agentId, "payments"));
        const salarySnapshot = await getDocs(salaryQuery);
        let totalPaid = 0;
        salarySnapshot.forEach(doc => { totalPaid += doc.data().amount || 0; });
        
        const pendingAmount = totalEarnings - totalPaid;

        if (pendingAmount <= 0) {
           toast({
            variant: "destructive",
            title: "No Pending Balance",
            description: `Agent ${values.agentId} has no pending amount to settle.`,
          });
          setIsLoading(false);
          return;
        }

        paymentAmount = pendingAmount;
        paymentPurpose = "Account Settlement";
      }

      const paymentsCollectionRef = collection(db, "salary", values.agentId, "payments");
      await addDoc(paymentsCollectionRef, {
        amount: paymentAmount,
        purpose: paymentPurpose,
        date: serverTimestamp(),
        status: "Issued",
      });

      toast({
        title: "Success!",
        description: `₹${paymentAmount.toLocaleString()} has been issued to Agent ${values.agentId}.`,
      });
      salaryForm.reset();
      setIsSalaryDialogOpen(false);
    } catch (error) {
      console.error("Error adding salary payment: ", error);
      toast({
        variant: "destructive",
        title: "Submission Error",
        description: "Could not save the salary payment. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onFundsSubmit(values: z.infer<typeof fundsFormSchema>) {
    setIsLoading(true);
    try {
        const fundsDocRef = doc(db, "company", "funds");
        await updateDoc(fundsDocRef, {
            balance: increment(values.amount)
        });
         toast({
            title: "Success!",
            description: `₹${values.amount.toLocaleString()} added to company funds.`,
        });
        fundsForm.reset();
        setIsFundsDialogOpen(false);
    } catch (error) {
         console.error("Error updating funds: ", error);
         toast({
            variant: "destructive",
            title: "Update Error",
            description: "Could not update company funds. Please try again.",
         });
    } finally {
        setIsLoading(false);
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
       <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finance Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage company funds, issue salaries, and track payments.</p>
        </div>
        <div className="flex gap-2">
            <Dialog open={isSalaryDialogOpen} onOpenChange={setIsSalaryDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Issue Salary
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                <DialogTitle>Issue Salary to Agent</DialogTitle>
                </DialogHeader>
                <Form {...salaryForm}>
                <form onSubmit={salaryForm.handleSubmit(onSalarySubmit)} className="space-y-6 py-4">
                <FormField
                    control={salaryForm.control}
                    name="agentId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Select Agent</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Choose an agent..." /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="ZN001">Agent ZN001</SelectItem>
                            <SelectItem value="ZN002">Agent ZN002</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={salaryForm.control}
                    name="purpose"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Purpose of Payment</FormLabel>
                        <FormControl><Input placeholder="e.g., Monthly Salary, Advance" {...field} disabled={watchSettleAccount} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={salaryForm.control}
                    name="amount"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Amount (₹)</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 5000" {...field} disabled={watchSettleAccount} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={salaryForm.control}
                    name="settleAccount"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <div className="space-y-1 leading-none">
                        <FormLabel>Settle Account</FormLabel>
                        <p className="text-sm text-muted-foreground">
                            Automatically pay the agent's full pending balance.
                        </p>
                        </div>
                    </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Issue Salary to Agent"}
                </Button>
                </form>
            </Form>
            </DialogContent>
            </Dialog>
        </div>
      </div>
        
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Company Funds</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">
            {companyFunds === null ? (
                <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
                `₹${companyFunds.toLocaleString()}`
            )}
            </div>
            <p className="text-xs text-muted-foreground">
                Total funds available for salary payments.
            </p>
             <Dialog open={isFundsDialogOpen} onOpenChange={setIsFundsDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="mt-4">Manage Funds</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                    <DialogTitle>Manage Company Funds</DialogTitle>
                    </DialogHeader>
                    <Form {...fundsForm}>
                        <form onSubmit={fundsForm.handleSubmit(onFundsSubmit)} className="space-y-6 py-4">
                             <FormField
                                control={fundsForm.control}
                                name="amount"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount to Add (₹)</FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g., 100000" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Add to Funds"}
                            </Button>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
            <CardTitle>Agent Payment Logs</CardTitle>
             <CardDescription>
                A detailed history of all payments made to each agent.
            </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="zn001">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="zn001">Agent ZN001</TabsTrigger>
              <TabsTrigger value="zn002">Agent ZN002</TabsTrigger>
            </TabsList>
            <TabsContent value="zn001" className="mt-4">
              <AgentPaymentHistory agentId="ZN001" companyFunds={companyFunds} />
            </TabsContent>
            <TabsContent value="zn002" className="mt-4">
              <AgentPaymentHistory agentId="ZN002" companyFunds={companyFunds} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
