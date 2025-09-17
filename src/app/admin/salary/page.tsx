
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { collection, addDoc, serverTimestamp, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, ArrowLeft } from "lucide-react";

const salaryFormSchema = z.object({
  agentId: z.enum(["ZN001", "ZN002"], { required_error: "You must select an agent." }),
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }),
  purpose: z.string().min(3, { message: "Purpose must be at least 3 characters long." }),
});

export default function AdminSalaryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const isAdmin = sessionStorage.getItem('isAdminAuthenticated');
    if (isAdmin !== 'true') {
      router.replace('/login');
    } else {
      setIsCheckingAuth(false);
    }
  }, [router]);

  const form = useForm<z.infer<typeof salaryFormSchema>>({
    resolver: zodResolver(salaryFormSchema),
    defaultValues: {
      amount: 0,
      purpose: "",
    },
  });

  async function onSubmit(values: z.infer<typeof salaryFormSchema>) {
    setIsLoading(true);
    try {
      // Reference to the agent's specific 'payments' subcollection
      const paymentsCollectionRef = collection(db, "salary", values.agentId, "payments");
      
      await addDoc(paymentsCollectionRef, {
        amount: values.amount,
        purpose: values.purpose,
        date: serverTimestamp(),
      });

      toast({
        title: "Success!",
        description: `₹${values.amount} has been credited to Agent ${values.agentId}.`,
      });
      form.reset();
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
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight">Credit Salary</CardTitle>
          <CardDescription>
            Fill out the form below to make a payment to an agent. This will be recorded in their salary log.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="agentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Agent</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an agent..." />
                        </SelectTrigger>
                      </FormControl>
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
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 5000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="purpose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purpose of Payment</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Monthly Salary, Advance, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Credit Salary to Agent"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
