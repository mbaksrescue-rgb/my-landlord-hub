-- ============================================
-- DATABASE INDEXING FOR PERFORMANCE (PRIORITY 1)
-- ============================================

-- Tenants indexes
CREATE INDEX IF NOT EXISTS idx_tenants_unit_id ON public.tenants(unit_id);
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON public.tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_created_at ON public.tenants(created_at DESC);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_rent_record_id ON public.payments(rent_record_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- Rent records indexes
CREATE INDEX IF NOT EXISTS idx_rent_records_tenant_id ON public.rent_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rent_records_unit_id ON public.rent_records(unit_id);
CREATE INDEX IF NOT EXISTS idx_rent_records_month_year ON public.rent_records(month_year DESC);
CREATE INDEX IF NOT EXISTS idx_rent_records_status ON public.rent_records(status);
CREATE INDEX IF NOT EXISTS idx_rent_records_due_date ON public.rent_records(due_date);

-- Maintenance requests indexes  
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_unit_id ON public.maintenance_requests(unit_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_tenant_id ON public.maintenance_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON public.maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_created_at ON public.maintenance_requests(created_at DESC);

-- Leases indexes
CREATE INDEX IF NOT EXISTS idx_leases_tenant_id ON public.leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_unit_id ON public.leases(unit_id);
CREATE INDEX IF NOT EXISTS idx_leases_end_date ON public.leases(end_date);
CREATE INDEX IF NOT EXISTS idx_leases_is_active ON public.leases(is_active);

-- Units indexes
CREATE INDEX IF NOT EXISTS idx_units_property_id ON public.units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON public.units(status);

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ============================================
-- ACTIVITY LOGS TABLE (PRIORITY 6)
-- ============================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for activity logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON public.activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);

-- Enable RLS on activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view activity logs
CREATE POLICY "Admins can view activity logs"
  ON public.activity_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- All authenticated users can insert their own activity logs
CREATE POLICY "Users can create activity logs"
  ON public.activity_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- CARETAKER PERMISSIONS TABLE (PRIORITY 6)
-- ============================================

CREATE TABLE IF NOT EXISTS public.caretaker_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  can_add_tenants boolean NOT NULL DEFAULT true,
  can_assign_units boolean NOT NULL DEFAULT true,
  can_end_leases boolean NOT NULL DEFAULT false,
  can_view_balances boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.caretaker_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can manage caretaker permissions
CREATE POLICY "Admins can manage caretaker permissions"
  ON public.caretaker_permissions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Caretakers can view their own permissions
CREATE POLICY "Caretakers can view their permissions"
  ON public.caretaker_permissions
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- MUST CHANGE PASSWORD FLAG (PRIORITY 2)
-- ============================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

-- ============================================
-- M-PESA TRANSACTIONS TABLE (PRIORITY 4)
-- ============================================

CREATE TABLE IF NOT EXISTS public.mpesa_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text UNIQUE NOT NULL,
  phone_number text NOT NULL,
  amount numeric NOT NULL,
  account_number text NOT NULL,
  transaction_date timestamptz NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  rent_record_id uuid REFERENCES public.rent_records(id),
  status text NOT NULL DEFAULT 'pending',
  matched boolean NOT NULL DEFAULT false,
  error_message text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

-- Indexes for M-Pesa transactions
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_account_number ON public.mpesa_transactions(account_number);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_tenant_id ON public.mpesa_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_status ON public.mpesa_transactions(status);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_transaction_date ON public.mpesa_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_matched ON public.mpesa_transactions(matched);

-- Enable RLS
ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;

-- Admins can manage M-Pesa transactions
CREATE POLICY "Admins can manage mpesa transactions"
  ON public.mpesa_transactions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Tenants can view their own M-Pesa transactions
CREATE POLICY "Tenants can view their mpesa transactions"
  ON public.mpesa_transactions
  FOR SELECT
  USING (tenant_id = get_tenant_id(auth.uid()));

-- ============================================
-- ENHANCED SYSTEM SETTINGS (PRIORITY 8)
-- ============================================

ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS late_fee_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS mpesa_paybill text;

ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS mpesa_consumer_key text;

ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS mpesa_consumer_secret text;

ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS sms_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS email_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS session_timeout_minutes integer NOT NULL DEFAULT 30;

-- ============================================
-- PASSWORD RESET TOKENS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for token lookup
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- No direct access - only via edge functions with service role
CREATE POLICY "No direct access to reset tokens"
  ON public.password_reset_tokens
  FOR ALL
  USING (false);