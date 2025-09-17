
import CallEntryForm from "@/components/call-entry-form";
import CallHistory from "@/components/call-history";
import EarningsDisplay from "@/components/earnings-display";

export default function DashboardPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Agent Dashboard</h1>
      <p className="text-muted-foreground mb-8">Log new call details and view your recent entries.</p>
      
      <div className="mb-8">
        <EarningsDisplay />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <CallEntryForm />
        </div>
        <div className="lg:col-span-3">
          <CallHistory />
        </div>
      </div>
    </div>
  );
}
