import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/lib/format';
import { FileText, Home, Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { differenceInDays } from 'date-fns';

export default function TenantLease() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-lease', user?.id],
    queryFn: async () => {
      // Get tenant with unit info
      const { data: tenant } = await supabase
        .from('tenants')
        .select(`
          id,
          move_in_date,
          unit:units(
            unit_number,
            monthly_rent,
            property:properties(name, location, property_type)
          )
        `)
        .eq('user_id', user!.id)
        .single();

      if (!tenant) return null;

      // Get active lease
      const { data: lease } = await supabase
        .from('leases')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .single();

      return { tenant, lease };
    },
    enabled: !!user,
  });

  const lease = data?.lease;
  const unit = data?.tenant?.unit;
  const daysRemaining = lease ? differenceInDays(new Date(lease.end_date), new Date()) : 0;

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Lease Details</h1>
        <p className="page-description">View your current lease agreement</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-80" />
      ) : !lease ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No active lease found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Lease Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Lease Agreement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={daysRemaining < 30 ? 'destructive' : 'default'}>
                  {daysRemaining < 0 ? 'Expired' : daysRemaining < 30 ? 'Expiring Soon' : 'Active'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Start Date</span>
                <span className="font-medium">{formatDate(lease.start_date)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">End Date</span>
                <span className="font-medium">{formatDate(lease.end_date)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Days Remaining</span>
                <span className={`font-medium ${daysRemaining < 30 ? 'text-destructive' : ''}`}>
                  {daysRemaining > 0 ? `${daysRemaining} days` : 'Expired'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Deposit Paid</span>
                <span className="font-medium">{formatCurrency(lease.deposit_amount)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Unit Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Unit Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Unit</span>
                <span className="font-medium">{unit?.unit_number}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Property</span>
                <span className="font-medium">{unit?.property?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium">{unit?.property?.location}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Type</span>
                <Badge variant="secondary" className="capitalize">
                  {unit?.property?.property_type}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Monthly Rent</span>
                <span className="font-medium text-primary">{formatCurrency(unit?.monthly_rent || 0)}</span>
              </div>
              {data?.tenant?.move_in_date && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Move-in Date</span>
                  <span className="font-medium">{formatDate(data.tenant.move_in_date)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
