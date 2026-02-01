import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate, formatMonthYear } from '@/lib/format';
import { StatCard } from '@/components/dashboard/StatCard';
import { StatusBadge } from '@/components/ui/status-badge';
import { CreditCard, Home, FileText, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export default function TenantDashboard() {
  const { user } = useAuth();

  const { data: tenantData, isLoading: tenantLoading } = useQuery({
    queryKey: ['tenant-data', user?.id],
    queryFn: async () => {
      // Get tenant record
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select(`
          *,
          unit:units(
            unit_number,
            monthly_rent,
            property:properties(name, location)
          )
        `)
        .eq('user_id', user!.id)
        .single();

      if (tenantError) throw tenantError;

      // Get rent records
      const { data: rentRecords, error: rentError } = await supabase
        .from('rent_records')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('due_date', { ascending: false })
        .limit(6);

      if (rentError) throw rentError;

      // Get active lease
      const { data: lease, error: leaseError } = await supabase
        .from('leases')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .single();

      // Get maintenance requests
      const { data: maintenance, error: maintError } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Calculate totals
      const currentBalance = rentRecords?.reduce((sum, record) => {
        return sum + (Number(record.amount_due) - Number(record.amount_paid));
      }, 0) || 0;

      return {
        tenant,
        rentRecords: rentRecords || [],
        lease,
        maintenance: maintenance || [],
        currentBalance,
      };
    },
    enabled: !!user,
  });

  if (tenantLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  const unit = tenantData?.tenant?.unit;
  const lease = tenantData?.lease;
  const rentRecords = tenantData?.rentRecords || [];
  const pendingMaintenance = tenantData?.maintenance?.filter((m: any) => m.status !== 'completed').length || 0;

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Welcome Back</h1>
        <p className="page-description">
          {unit ? `${unit.unit_number} at ${unit.property?.name}` : 'Your tenant dashboard'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Current Balance"
          value={formatCurrency(tenantData?.currentBalance || 0)}
          icon={CreditCard}
          variant={tenantData?.currentBalance && tenantData.currentBalance > 0 ? 'vacant' : 'collected'}
        />
        <StatCard
          title="Monthly Rent"
          value={formatCurrency(unit?.monthly_rent || 0)}
          icon={Home}
        />
        <StatCard
          title="Lease Ends"
          value={lease ? formatDate(lease.end_date) : 'N/A'}
          icon={FileText}
        />
        <StatCard
          title="Open Requests"
          value={pendingMaintenance}
          icon={Wrench}
          variant={pendingMaintenance > 0 ? 'maintenance' : undefined}
        />
      </div>

      {/* Recent Rent Records */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Rent Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rentRecords.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No rent records yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Amount Due</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rentRecords.map((record: any) => {
                  const balance = Number(record.amount_due) - Number(record.amount_paid);
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {formatMonthYear(record.month_year)}
                      </TableCell>
                      <TableCell>{formatCurrency(record.amount_due)}</TableCell>
                      <TableCell>{formatCurrency(record.amount_paid)}</TableCell>
                      <TableCell className={balance > 0 ? 'text-destructive font-medium' : 'text-success'}>
                        {formatCurrency(balance)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={record.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
