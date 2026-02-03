import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Optimized query options for faster perceived loading
const fastQueryOptions = {
  staleTime: 1000 * 60 * 2, // 2 minutes
  gcTime: 1000 * 60 * 5, // 5 minutes
};

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
    ...fastQueryOptions,
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
    ...fastQueryOptions,
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
    ...fastQueryOptions,
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
    ...fastQueryOptions,
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
    ...fastQueryOptions,
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
    ...fastQueryOptions,
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
    ...fastQueryOptions,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard_stats'],
    queryFn: async () => {
      // Run all queries in parallel for faster loading
      const [
        propertiesResult,
        unitsResult,
        rentRecordsResult,
        maintenanceResult,
      ] = await Promise.all([
        supabase.from('properties').select('*', { count: 'exact', head: true }),
        supabase.from('units').select('status'),
        supabase.from('rent_records').select('amount_due, amount_paid, status').eq('month_year', new Date().toISOString().slice(0, 7)),
        supabase.from('maintenance_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      const units = unitsResult.data || [];
      const totalUnits = units.length;
      const occupiedUnits = units.filter(u => u.status === 'occupied').length;
      const vacantUnits = units.filter(u => u.status === 'vacant').length;
      const maintenanceUnits = units.filter(u => u.status === 'maintenance').length;

      const rentRecords = rentRecordsResult.data || [];
      const totalRentDue = rentRecords.reduce((sum, r) => sum + Number(r.amount_due), 0);
      const totalRentCollected = rentRecords.reduce((sum, r) => sum + Number(r.amount_paid), 0);
      const outstandingBalance = totalRentDue - totalRentCollected;

      return {
        propertiesCount: propertiesResult.count || 0,
        totalUnits,
        occupiedUnits,
        vacantUnits,
        maintenanceUnits,
        totalRentDue,
        totalRentCollected,
        outstandingBalance,
        pendingMaintenance: maintenanceResult.count || 0,
      };
    },
    ...fastQueryOptions,
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
    ...fastQueryOptions,
  });
}
