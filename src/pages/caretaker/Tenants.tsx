import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useTenants, useUnits } from '@/hooks/useAdminData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatDate } from '@/lib/format';
import { Plus, Users, Eye, EyeOff, Phone, Mail } from 'lucide-react';
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

interface TenantFormData {
  full_name: string;
  email: string;
  password: string;
  phone: string;
  national_id: string;
  next_of_kin: string;
  unit_id: string;
  move_in_date: string;
}

export default function CaretakerTenants() {
  const { data: tenants, isLoading } = useTenants();
  const { data: units } = useUnits();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<TenantFormData>({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    national_id: '',
    next_of_kin: '',
    unit_id: '',
    move_in_date: new Date().toISOString().split('T')[0],
  });

  const vacantUnits = units?.filter((u: any) => u.status === 'vacant') || [];

  const handleOpenDialog = () => {
    setFormData({
      full_name: '',
      email: '',
      password: '',
      phone: '',
      national_id: '',
      next_of_kin: '',
      unit_id: '',
      move_in_date: new Date().toISOString().split('T')[0],
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Use edge function to create tenant with admin privileges
      const { data, error } = await supabase.functions.invoke('create-tenant', {
        body: {
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          phone: formData.phone || undefined,
          national_id: formData.national_id || undefined,
          next_of_kin: formData.next_of_kin || undefined,
          unit_id: formData.unit_id || undefined,
          move_in_date: formData.move_in_date || undefined,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to create tenant');

      toast.success('Tenant created successfully');
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Error creating tenant:', error);
      toast.error(error.message || 'Failed to create tenant');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div className="page-header mb-0">
          <h1 className="page-title">Tenants</h1>
          <p className="page-description">Add and manage tenants</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Tenant</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this password with the tenant so they can sign in
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+254..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="national_id">National ID</Label>
                  <Input
                    id="national_id"
                    value={formData.national_id}
                    onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="next_of_kin">Next of Kin</Label>
                <Input
                  id="next_of_kin"
                  value={formData.next_of_kin}
                  onChange={(e) => setFormData({ ...formData, next_of_kin: e.target.value })}
                  placeholder="Name - Phone"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit_id">Assign Unit</Label>
                  <Select
                    value={formData.unit_id}
                    onValueChange={(value) => setFormData({ ...formData, unit_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {vacantUnits.map((unit: any) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.unit_number} - {unit.property?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="move_in_date">Move-in Date</Label>
                  <Input
                    id="move_in_date"
                    type="date"
                    value={formData.move_in_date}
                    onChange={(e) => setFormData({ ...formData, move_in_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Tenant'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : tenants?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No tenants yet</p>
              <Button className="mt-4" onClick={handleOpenDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Tenant
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Move-in Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants?.map((tenant: any) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">
                      {tenant.profile?.full_name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {tenant.profile?.email}
                        </div>
                        {tenant.profile?.phone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {tenant.profile.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {tenant.unit ? (
                        <Badge variant="secondary">
                          {tenant.unit.unit_number} - {tenant.unit.property?.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {tenant.move_in_date ? formatDate(tenant.move_in_date) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}