
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, getDocs, doc, updateDoc } from "firebase/firestore";
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
import { Loader2, PlusCircle, CheckCircle } from "lucide-react";

const salaryFormSchema = z.object({
  agentId: z.enum(["ZN001", "ZN002"], { required_error: "You must select an agent." }),
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }).optional(),
  purpose: z.string().min(3, { message: "Purpose must be at least 3 characters long." }),
  settleAccount: z.boolean().default(false),
}).refine(data => data.settleAccount || (data.amount && data.amount > 0), {
    message: "Amount is required unless you are settling the account.",
    path: ["amount"],
});

const CALL_RATE = 15;

function AgentPaymentHistory({ agentId }: { agentId: "ZN001" | "ZN002" }) {
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

  const handleMarkAsCredited = async (paymentId: string) => {
    setIsUpdating(paymentId);
    try {
      const paymentDocRef = doc(db, "salary", agentId, "payments", paymentId);
      await updateDoc(paymentDocRef, { status: "Credited" });
      toast({
        title: "Success",
        description: "Payment status updated to Credited.",
      });
    } catch (error) {
      console.error("Error updating payment status:", error);
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
            payments.map(payment => (
              <TableRow key={payment.id}>
                <TableCell>{payment.date?.toDate().toLocaleDateString() || 'N/A'}</TableCell>
                <TableCell className="font-medium">{payment.purpose}</TableCell>
                <TableCell className="font-mono">₹{(payment.amount || 0).toLocaleString()}</TableCell>
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
                      onClick={() => handleMarkAsCredited(payment.id)}
                      disabled={isUpdating === payment.id}
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
            ))
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

  useEffect(() => {
    // This effect should only run on the client
    if (sessionStorage.getItem('isAdminAuthenticated') !== 'true') {
      router.replace('/login');
    } else {
      setIsCheckingAuth(false);
    }
  }, [router]);

  const salaryForm = useForm<z.infer<typeof salaryFormSchema>>({
    resolver: zodResolver(salaryFormSchema),
    defaultValues: {
      purpose: "",
      settleAccount: false
    },
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
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Issue salaries and track payment history.</p>
        </div>
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
      
      <Card>
        <CardHeader>
            <CardTitle>Agent Payment Logs</CardTitle>
             <CardDescription>
                A detailed history of all payments made to each agent. Mark payments as "Credited" once paid.
            </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="zn001">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="zn001">Agent ZN001</TabsTrigger>
              <TabsTrigger value="zn002">Agent ZN002</TabsTrigger>
            </TabsList>
            <TabsContent value="zn001" className="mt-4">
              <AgentPaymentHistory agentId="ZN001" />
            </TabsContent>
            <TabsContent value="zn002" className="mt-4">
              <AgentPaymentHistory agentId="ZN002" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

    