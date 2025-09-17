"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import type { CallEntry } from "@/lib/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function CallHistory() {
  const { agentId } = useAuth();
  const [callEntries, setCallEntries] = useState<CallEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If agentId is not yet available, don't do anything.
    // Set loading to false and clear entries if it's explicitly null after loading.
    if (!agentId) {
        setIsLoading(false);
        setCallEntries([]);
        return;
    };

    setIsLoading(true);
    // The collection name is now the agent's ID (e.g., "ZN001")
    const q = query(
      collection(db, agentId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const entries: CallEntry[] = [];
      querySnapshot.forEach((doc) => {
        entries.push({ id: doc.id, ...doc.data() } as CallEntry);
      });
      setCallEntries(entries);
      setIsLoading(false);
    }, (error) => {
        console.error(`Error fetching call history for ${agentId}: `, error);
        setIsLoading(false);
    });

    // Cleanup the listener when the component unmounts or agentId changes.
    return () => unsubscribe();
  }, [agentId]); // This effect re-runs whenever agentId changes.

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
        <CardTitle>Recent Call History ({agentId || '...'})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Call ID</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Outcome</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-6 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : callEntries.length > 0 ? (
              callEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-muted-foreground">#{entry.callId}</TableCell>
                  <TableCell className="font-medium">{entry.clientName}</TableCell>
                  <TableCell>{entry.createdAt?.toDate().toLocaleString() || 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={getBadgeVariant(entry.outcome)}>
                      {entry.outcome}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No call entries found for this agent.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
