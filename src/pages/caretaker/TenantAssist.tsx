import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useTenants, useRentRecords, useMaintenanceRequests, useUnits } from '@/hooks/useAdminData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatCurrency, formatMonthYear } from '@/lib/format';
import { StatusBadge } from '@/components/ui/status-badge';
import { Headphones, Search, User, CreditCard, Wrench, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function TenantAssist() {
  const { data: tenants, isLoading: tenantsLoading } = useTenants();
  const { data: rentRecords, isLoading: rentLoading } = useRentRecords();
  const { data: maintenanceRequests, isLoading: maintenanceLoading } = useMaintenanceRequests();
  const { data: units } = useUnits();
  const queryClient = useQueryClient();
  
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    title: '',
    description: '',
  });

  // Filter tenants by search query
  const filteredTenants = tenants?.filter((tenant: any) => {
    const name = tenant.profile?.full_name?.toLowerCase() || '';
    const email = tenant.profile?.email?.toLowerCase() || '';
    const phone = tenant.profile?.phone?.toLowerCase() || '';
    const unit = tenant.unit?.unit_number?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query) || phone.includes(query) || unit.includes(query);
  }) || [];

  // Get selected tenant's rent records and maintenance requests
  const tenantRentRecords = selectedTenant
    ? rentRecords?.filter((r: any) => r.tenant_id === selectedTenant.id) || []
    : [];
  
  const tenantMaintenance = selectedTenant
    ? maintenanceRequests?.filter((r: any) => r.tenant_id === selectedTenant.id) || []
    : [];

  const handleSubmitMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .insert({
          tenant_id: selectedTenant.id,
          unit_id: selectedTenant.unit_id,
          title: maintenanceForm.title,
          description: maintenanceForm.description,
          status: 'pending',
        });
        
      if (error) throw error;
      
      toast.success('Maintenance request submitted for ' + selectedTenant.profile?.full_name);
      queryClient.invalidateQueries({ queryKey: ['maintenance_requests'] });
      setIsMaintenanceDialogOpen(false);
      setMaintenanceForm({ title: '', description: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit maintenance request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Headphones className="h-6 w-6 text-primary" />
          Tenant Assist
        </h1>
        <p className="page-description">
          Help tenants who don't have smartphones check their balance or submit maintenance requests
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tenant Search */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Find Tenant
            </CardTitle>
            <CardDescription>
              Search by name, email, phone, or unit number
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Search tenants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-4"
            />
            
            {tenantsLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : filteredTenants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {searchQuery ? 'No tenants found' : 'Start typing to search'}
              </p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-auto">
                {filteredTenants.map((tenant: any) => (
                  <button
                    key={tenant.id}
                    onClick={() => setSelectedTenant(tenant)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedTenant?.id === tenant.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <p className="font-medium">{tenant.profile?.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {tenant.unit?.unit_number || 'No unit'} • {tenant.profile?.phone || 'No phone'}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tenant Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedTenant ? selectedTenant.profile?.full_name : 'Select a Tenant'}
            </CardTitle>
            {selectedTenant && (
              <CardDescription>
                {selectedTenant.unit?.unit_number} • {selectedTenant.profile?.phone || 'No phone'} • {selectedTenant.profile?.email}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {!selectedTenant ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <User className="h-12 w-12 mb-4" />
                <p>Select a tenant to view their details</p>
              </div>
            ) : (
              <Tabs defaultValue="payments">
                <TabsList className="mb-4">
                  <TabsTrigger value="payments" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Rent & Payments
                  </TabsTrigger>
                  <TabsTrigger value="maintenance" className="flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Maintenance
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="payments">
                  {rentLoading ? (
                    <Skeleton className="h-40" />
                  ) : tenantRentRecords.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No rent records for this tenant
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead>Amount Due</TableHead>
                          <TableHead>Amount Paid</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tenantRentRecords.map((record: any) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">
                              {formatMonthYear(record.month_year)}
                            </TableCell>
                            <TableCell>{formatCurrency(record.amount_due)}</TableCell>
                            <TableCell>{formatCurrency(record.amount_paid)}</TableCell>
                            <TableCell className={Number(record.amount_due) - Number(record.amount_paid) > 0 ? 'text-destructive font-medium' : ''}>
                              {formatCurrency(Number(record.amount_due) - Number(record.amount_paid))}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={record.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
                
                <TabsContent value="maintenance">
                  <div className="flex justify-end mb-4">
                    <Button 
                      onClick={() => setIsMaintenanceDialogOpen(true)}
                      disabled={!selectedTenant?.unit_id}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Submit Request
                    </Button>
                  </div>
                  
                  {!selectedTenant?.unit_id ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      This tenant is not assigned to a unit
                    </p>
                  ) : maintenanceLoading ? (
                    <Skeleton className="h-40" />
                  ) : tenantMaintenance.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No maintenance requests for this tenant
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Issue</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tenantMaintenance.map((request: any) => (
                          <TableRow key={request.id}>
                            <TableCell className="font-medium">{request.title}</TableCell>
                            <TableCell className="max-w-xs truncate">{request.description}</TableCell>
                            <TableCell>
                              <StatusBadge status={request.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Request Dialog */}
      <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Maintenance Request</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitMaintenance} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Issue Title *</Label>
              <Input
                id="title"
                value={maintenanceForm.title}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, title: e.target.value })}
                placeholder="e.g., Leaking tap in kitchen"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={maintenanceForm.description}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                placeholder="Describe the issue in detail..."
                required
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsMaintenanceDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}