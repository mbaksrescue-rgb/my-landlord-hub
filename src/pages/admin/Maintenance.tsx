import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useMaintenanceRequests } from '@/hooks/useAdminData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatDate, formatCurrency } from '@/lib/format';
import { StatusBadge } from '@/components/ui/status-badge';
import { Wrench, DollarSign } from 'lucide-react';
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

const maintenanceStatuses = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

export default function Maintenance() {
  const { data: requests, isLoading } = useMaintenanceRequests();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    status: 'pending',
    repair_cost: '',
  });

  const handleOpenDialog = (request: any) => {
    setSelectedRequest(request);
    setFormData({
      status: request.status,
      repair_cost: request.repair_cost ? String(request.repair_cost) : '',
    });
    setIsDialogOpen(true);
  };

  const handleUpdateRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const updateData: any = {
        status: formData.status,
        repair_cost: formData.repair_cost ? parseFloat(formData.repair_cost) : null,
      };

      if (formData.status === 'completed') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('maintenance_requests')
        .update(updateData)
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success('Maintenance request updated');
      queryClient.invalidateQueries({ queryKey: ['maintenance_requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Maintenance</h1>
        <p className="page-description">Manage maintenance requests from tenants</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : requests?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No maintenance requests yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Issue</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests?.map((request: any) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{request.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {request.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {request.unit?.unit_number} - {request.unit?.property?.name}
                    </TableCell>
                    <TableCell>{request.tenant?.profile?.full_name || 'N/A'}</TableCell>
                    <TableCell>{formatDate(request.created_at)}</TableCell>
                    <TableCell>
                      <StatusBadge status={request.status} />
                    </TableCell>
                    <TableCell>
                      {request.repair_cost ? formatCurrency(request.repair_cost) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDialog(request)}
                      >
                        Update
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Maintenance Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <form onSubmit={handleUpdateRequest} className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <p className="font-medium">{selectedRequest.title}</p>
                <p className="text-sm text-muted-foreground">{selectedRequest.description}</p>
                <p className="text-sm">
                  <strong>Unit:</strong> {selectedRequest.unit?.unit_number} - {selectedRequest.unit?.property?.name}
                </p>
                <p className="text-sm">
                  <strong>Submitted:</strong> {formatDate(selectedRequest.created_at)}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {maintenanceStatuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Repair Cost (KES)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="number"
                    min="0"
                    className="pl-9"
                    value={formData.repair_cost}
                    onChange={(e) => setFormData({ ...formData, repair_cost: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
