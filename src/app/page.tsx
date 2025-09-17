
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound, Shield } from "lucide-react";

const PRE_LOGIN_KEY = "preLoginAuthenticated";

// --- Step 1: Secret Code ---
const step1Schema = z.object({
  secretCode: z.string().refine(val => val.toLowerCase() === 'unicorn', {
    message: "Invalid Secret Code.",
  }),
});

// --- Step 2: Protocol Code ---
const step2Schema = z.object({
  protocolCode: z.string().refine(val => val.toUpperCase() === 'ZYNQ50', {
    message: "Invalid Protocol Code.",
  }),
});


export default function PreLoginPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);

    useEffect(() => {
        if (sessionStorage.getItem(PRE_LOGIN_KEY) === 'true') {
            router.replace('/login');
        } else {
            setIsCheckingSession(false);
        }
    }, [router]);

    const step1Form = useForm<z.infer<typeof step1Schema>>({
        resolver: zodResolver(step1Schema),
        defaultValues: { secretCode: "" },
    });

    const step2Form = useForm<z.infer<typeof step2Schema>>({
        resolver: zodResolver(step2Schema),
        defaultValues: { protocolCode: "" },
    });


    const onStep1Submit = (values: z.infer<typeof step1Schema>) => {
        setIsLoading(true);
        toast({
            title: `Step 1 Cleared!`,
            description: "Proceeding to the next security layer.",
            className: "bg-green-500 text-white",
        });
        setTimeout(() => {
            setStep(2);
            setIsLoading(false);
        }, 1000);
    };

    const onStep2Submit = (values: z.infer<typeof step2Schema>) => {
        setIsLoading(true);
        toast({
            title: "Access Granted!",
            description: "All security protocols cleared. Redirecting to portal...",
            className: "bg-green-500 text-white",
        });
        setTimeout(() => {
            sessionStorage.setItem(PRE_LOGIN_KEY, 'true');
            router.push('/login');
        }, 1500);
    };
    
    if (isCheckingSession) {
        return (
          <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Welcome to ZynqAssist</h1>
                    <p className="text-muted-foreground">Please complete the security verification process.</p>
                </div>
                
                {step === 1 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><KeyRound/> Security Protocol 1/2</CardTitle>
                            <CardDescription>Enter the primary secret code.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...step1Form}>
                                <form onSubmit={step1Form.handleSubmit(onStep1Submit)} className="space-y-4">
                                    <FormField
                                        control={step1Form.control}
                                        name="secretCode"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Secret Code</FormLabel>
                                                <FormControl><Input type="password" placeholder="e.g., UNICORN" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? <Loader2 className="animate-spin" /> : "Verify Code"}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                )}
                
                {step === 2 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Shield/> Security Protocol 2/2</CardTitle>
                            <CardDescription>Enter the final protocol to access the portal.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...step2Form}>
                                <form onSubmit={step2Form.handleSubmit(onStep2Submit)} className="space-y-4">
                                    <FormField
                                        control={step2Form.control}
                                        name="protocolCode"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Protocol Code</FormLabel>
                                                <FormControl><Input placeholder="e.g., ZYNQ50" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                         {isLoading ? <><Loader2 className="animate-spin mr-2" /> Granting Access...</> : "Enter Portal"}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
