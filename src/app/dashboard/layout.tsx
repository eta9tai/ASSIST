
import ProtectedRoute from '@/components/protected-route';
import Header from '@/components/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 bg-muted/40">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
