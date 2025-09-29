
"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy, doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import type { CallEntry } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { format, startOfDay, isSameDay } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Pencil, Info, Loader2 } from "lucide-react";


interface DailyCallGroup {
  date: string;
  calls: CallEntry[];
  successRatio: number;
}

export default function CallHistory() {
  const { agentId } = useAuth();
  const { toast } = useToast();
  const [groupedCalls, setGroupedCalls] = useState<DailyCallGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallEntry | null>(null);
  const [newOutcome, setNewOutcome] = useState<CallEntry['outcome'] | ''>('');


  useEffect(() => {
    if (!agentId) {
      setIsLoading(true);
      return;
    }

    setIsLoading(true);
    const q = query(collection(db, agentId), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const entries: CallEntry[] = [];
        querySnapshot.forEach((doc) => {
          entries.push({ id: doc.id, ...doc.data() } as CallEntry);
        });

        const groups: { [key: string]: CallEntry[] } = entries.reduce((acc, call) => {
          const callDate = call.createdAt?.toDate ? format(call.createdAt.toDate(), 'yyyy-MM-dd') : 'Unknown Date';
          if (!acc[callDate]) {
            acc[callDate] = [];
          }
          acc[callDate].push(call);
          return acc;
        }, {} as { [key: string]: CallEntry[] });

        const dailyGroups: DailyCallGroup[] = Object.keys(groups).map(dateStr => {
          const calls = groups[dateStr].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
          const totalCalls = calls.length;
          const nonResolvedCalls = calls.filter(c => c.outcome === 'Escalated' || c.outcome === 'Follow-up Required').length;
          const successRatio = totalCalls > 0 ? (nonResolvedCalls / totalCalls) * 100 : 0;
          
          return {
            date: dateStr,
            calls: calls,
            successRatio: successRatio
          };
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setGroupedCalls(dailyGroups);
        setIsLoading(false);
      },
      (error) => {
        console.error(`Error fetching call history for ${agentId}: `, error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [agentId]);

  const openEditDialog = (call: CallEntry) => {
    if (call.outcome === 'Resolved') {
        toast({
            variant: "destructive",
            title: "Action Not Allowed",
            description: "Cannot edit a call that has already been marked as Resolved.",
        });
        return;
    }
    setSelectedCall(call);
    setNewOutcome(call.outcome);
    setIsEditDialogOpen(true);
  };
  
  const handleUpdateOutcome = async () => {
    if (!selectedCall || !newOutcome || newOutcome === selectedCall.outcome) {
      setIsEditDialogOpen(false);
      return;
    }
    setIsUpdating(selectedCall.id);

    try {
        const callDocRef = doc(db, agentId!, selectedCall.id);
        
        let updateData: { outcome: string; edited?: boolean, editBonus?: number } = {
            outcome: newOutcome,
        };

        // Add bonus only if it's the first edit
        if (!selectedCall.edited) {
            updateData.edited = true;
        }

        await updateDoc(callDocRef, updateData);

        toast({
            title: "Success!",
            description: `Call #${selectedCall.callId} status updated to ${newOutcome}.` + (!selectedCall.edited ? " A bonus of ₹5 has been credited." : ""),
        });

    } catch (error) {
        console.error("Error updating document: ", error);
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Could not update the call status. Please try again.",
        });
    } finally {
        setIsUpdating(null);
        setIsEditDialogOpen(false);
        setSelectedCall(null);
    }
  };

  const getBadgeVariant = (outcome: CallEntry["outcome"]) => {
    switch (outcome) {
      case "Resolved":
        return "default";
      case "Escalated":
        return "destructive";
      case "Follow-up Required":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Call History & Daily Stats ({agentId || '...'})</CardTitle>
        <CardDescription>Review call logs, edit statuses, and track daily performance.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full mb-2" />)
        ) : groupedCalls.length > 0 ? (
          <Accordion type="single" collapsible className="w-full" defaultValue={`item-${groupedCalls[0].date}`}>
             <TooltipProvider>
                {groupedCalls.map(({ date, calls, successRatio }) => (
                <AccordionItem value={`item-${date}`} key={date}>
                    <AccordionTrigger>
                        <div className="flex justify-between w-full pr-4">
                            <span className="font-semibold">{format(new Date(date), 'MMMM d, yyyy')}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                    Success Ratio: {successRatio.toFixed(1)}%
                                </span>
                                 <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="h-4 w-4 text-muted-foreground cursor-help"/>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>(Follow-up + Escalated) / Total Calls</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead className="w-[100px]">Daily Call #</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead>Outcome</TableHead>
                             <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {calls.map((entry, index) => (
                            <TableRow key={entry.id}>
                                <TableCell className="font-mono text-muted-foreground">#{calls.length - index}</TableCell>
                                <TableCell className="font-medium">{entry.clientName}</TableCell>
                                <TableCell>{entry.createdAt?.toDate().toLocaleTimeString() || 'N/A'}</TableCell>
                                <TableCell>
                                    <p className="truncate max-w-xs">{entry.notes}</p>
                                </TableCell>
                                <TableCell>
                                <Badge variant={getBadgeVariant(entry.outcome)}>{entry.outcome}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button 
                                        variant="outline" 
                                        size="icon" 
                                        onClick={() => openEditDialog(entry)}
                                        disabled={entry.outcome === 'Resolved' || isUpdating === entry.id}
                                    >
                                        {isUpdating === entry.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Pencil className="h-4 w-4" />}
                                        <span className="sr-only">Edit Status</span>
                                    </Button>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </AccordionContent>
                </AccordionItem>
                ))}
             </TooltipProvider>
          </Accordion>
        ) : (
          <div className="text-center text-muted-foreground h-24 flex items-center justify-center">
            No call entries found for this agent.
          </div>
        )}
      </CardContent>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Call Outcome for #{selectedCall?.callId}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <p className="text-sm text-muted-foreground">
                Current Status: <Badge variant={getBadgeVariant(selectedCall?.outcome!)}>{selectedCall?.outcome}</Badge>
             </p>
             <p className="text-sm">
                Select the new outcome for this call. A bonus of ₹5 will be added for the first edit.
             </p>
             <Select onValueChange={(value) => setNewOutcome(value as CallEntry['outcome'])} defaultValue={newOutcome || ''}>
                <SelectTrigger>
                    <SelectValue placeholder="Select new outcome..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                    <SelectItem value="Escalated">Escalated</SelectItem>
                    <SelectItem value="Follow-up Required">Follow-up Required</SelectItem>
                </SelectContent>
             </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateOutcome} disabled={isUpdating === selectedCall?.id || newOutcome === selectedCall?.outcome}>
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Update Status
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
