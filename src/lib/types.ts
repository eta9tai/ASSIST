
import type { Timestamp } from "firebase/firestore";

export type CallEntry = {
  id: string;
  callId: string;
  clientName: string;
  clientPhone: string;
  notes: string;
  outcome: "Resolved" | "Escalated" | "Follow-up Required";
  createdAt: Timestamp;
  edited?: boolean; // To track if the status has been edited for the bonus
};

export type SalaryPayment = {
  id: string;
  amount: number;
  purpose: string;
  date: Timestamp;
  status?: "Issued" | "Credited" | "Cancelled";
};
