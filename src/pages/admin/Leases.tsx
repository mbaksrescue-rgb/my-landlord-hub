import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useLeases, useTenants, useUnits } from '@/hooks/useAdminData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatDate, formatCurrency } from '@/lib/format';
import { Plus, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { differenceInDays } from 'date-fns';

interface LeaseFormData {
  tenant_id: string;
  unit_id: string;
  start_date: string;
  end_date: string;
  deposit_amount: string;
}

export default function Leases() {
  const { data: leases, isLoading } = useLeases();
  const { data: tenants } = useTenants();
  const { data: units } = useUnits();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<LeaseFormData>({
    tenant_id: '',
    unit_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    deposit_amount: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from('leases')
        .insert({
          tenant_id: formData.tenant_id,
          unit_id: formData.unit_id,
          start_date: formData.start_date,
          end_date: formData.end_date,
          deposit_amount: parseFloat(formData.deposit_amount),
        });

      if (error) throw error;

      toast.success('Lease created successfully');
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getLeaseStatus = (endDate: string, isActive: boolean) => {
    if (!isActive) return { label: 'Inactive', variant: 'secondary' as const };
    
    const daysRemaining = differenceInDays(new Date(endDate), new Date());
    
    if (daysRemaining < 0) return { label: 'Expired', variant: 'destructive' as const };
    if (daysRemaining <= 30) return { label: 'Expiring Soon', variant: 'outline' as const };
    return { label: 'Active', variant: 'default' as const };
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div className="page-header mb-0">
          <h1 className="page-title">Leases</h1>
          <p className="page-description">Manage lease agreements</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!tenants?.length}>
              <Plus className="mr-2 h-4 w-4" />
              Create Lease
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Lease</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenant">Tenant</Label>
                <Select
                  value={formData.tenant_id}
                  onValueChange={(value) => setFormData({ ...formData, tenant_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants?.map((tenant: any) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.profile?.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select
                  value={formData.unit_id}
                  onValueChange={(value) => setFormData({ ...formData, unit_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units?.map((unit: any) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.unit_number} - {unit.property?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit_amount">Deposit Amount (KES)</Label>
                <Input
                  id="deposit_amount"
                  type="number"
                  min="0"
                  step="100"
                  value={formData.deposit_amount}
                  onChange={(e) => setFormData({ ...formData, deposit_amount: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Lease</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : leases?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No leases yet</p>
              {tenants?.length ? (
                <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Lease
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">
                  Add tenants first to create leases
                </p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Deposit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leases?.map((lease: any) => {
                  const status = getLeaseStatus(lease.end_date, lease.is_active);
                  const isExpiringSoon = status.label === 'Expiring Soon';
                  
                  return (
                    <TableRow key={lease.id}>
                      <TableCell className="font-medium">
                        {lease.tenant?.profile?.full_name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {lease.unit?.unit_number} - {lease.unit?.property?.name}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{formatDate(lease.start_date)} - {formatDate(lease.end_date)}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(lease.deposit_amount)}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant} className="gap-1">
                          {isExpiringSoon && <AlertTriangle className="h-3 w-3" />}
                          {status.label}
                        </Badge>
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
