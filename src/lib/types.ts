
import type { Timestamp } from "firebase/firestore";

export type CallEntry = {
  id: string;
  callId: string;
  clientName: string;
  clientPhone: string;
  notes: string;
  outcome: "Resolved" | "Escalated" | "Follow-up Required";
  createdAt: Timestamp;
};

export type SalaryPayment = {
  id: string;
  amount: number;
  purpose: string;
  date: Timestamp;
};
