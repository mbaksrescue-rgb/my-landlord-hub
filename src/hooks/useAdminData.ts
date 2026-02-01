import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useProperties() {
  return useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useUnits(propertyId?: string) {
  return useQuery({
    queryKey: ['units', propertyId],
    queryFn: async () => {
      let query = supabase
        .from('units')
        .select(`
          *,
          property:properties(id, name)
        `)
        .order('created_at', { ascending: false });
      
      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useTenants() {
  return useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          profile:profiles!tenants_user_id_fkey(full_name, email, phone, national_id, next_of_kin),
          unit:units(id, unit_number, property:properties(name))
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useLeases() {
  return useQuery({
    queryKey: ['leases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leases')
        .select(`
          *,
          tenant:tenants(id, profile:profiles!tenants_user_id_fkey(full_name)),
          unit:units(id, unit_number, property:properties(name))
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useRentRecords() {
  return useQuery({
    queryKey: ['rent_records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rent_records')
        .select(`
          *,
          tenant:tenants(id, profile:profiles!tenants_user_id_fkey(full_name)),
          unit:units(id, unit_number)
        `)
        .order('due_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function usePayments() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          tenant:tenants(id, profile:profiles!tenants_user_id_fkey(full_name)),
          rent_record:rent_records(month_year, unit:units(unit_number))
        `)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useMaintenanceRequests() {
  return useQuery({
    queryKey: ['maintenance_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          tenant:tenants(id, profile:profiles!tenants_user_id_fkey(full_name)),
          unit:units(id, unit_number, property:properties(name))
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard_stats'],
    queryFn: async () => {
      // Get properties count
      const { count: propertiesCount } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true });

      // Get units by status
      const { data: units } = await supabase
        .from('units')
        .select('status');

      const totalUnits = units?.length || 0;
      const occupiedUnits = units?.filter(u => u.status === 'occupied').length || 0;
      const vacantUnits = units?.filter(u => u.status === 'vacant').length || 0;
      const maintenanceUnits = units?.filter(u => u.status === 'maintenance').length || 0;

      // Get current month rent collection
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: rentRecords } = await supabase
        .from('rent_records')
        .select('amount_due, amount_paid, status')
        .eq('month_year', currentMonth);

      const totalRentDue = rentRecords?.reduce((sum, r) => sum + Number(r.amount_due), 0) || 0;
      const totalRentCollected = rentRecords?.reduce((sum, r) => sum + Number(r.amount_paid), 0) || 0;
      const outstandingBalance = totalRentDue - totalRentCollected;

      // Get pending maintenance requests
      const { count: pendingMaintenance } = await supabase
        .from('maintenance_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      return {
        propertiesCount: propertiesCount || 0,
        totalUnits,
        occupiedUnits,
        vacantUnits,
        maintenanceUnits,
        totalRentDue,
        totalRentCollected,
        outstandingBalance,
        pendingMaintenance: pendingMaintenance || 0,
      };
    },
  });
}

export function useSystemSettings() {
  return useQuery({
    queryKey: ['system_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
  });
}
