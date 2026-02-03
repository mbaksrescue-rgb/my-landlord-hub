-- Allow caretakers to view all tenants
CREATE POLICY "Caretakers can view tenants" 
ON public.tenants 
FOR SELECT 
USING (has_role(auth.uid(), 'caretaker'));

-- Allow caretakers to view all profiles
CREATE POLICY "Caretakers can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'caretaker'));

-- Allow caretakers to view all units
CREATE POLICY "Caretakers can view all units" 
ON public.units 
FOR SELECT 
USING (has_role(auth.uid(), 'caretaker'));

-- Allow caretakers to view all properties
CREATE POLICY "Caretakers can view properties" 
ON public.properties 
FOR SELECT 
USING (has_role(auth.uid(), 'caretaker'));

-- Allow caretakers to view rent records
CREATE POLICY "Caretakers can view rent records" 
ON public.rent_records 
FOR SELECT 
USING (has_role(auth.uid(), 'caretaker'));

-- Allow caretakers to view all maintenance requests
CREATE POLICY "Caretakers can view maintenance requests" 
ON public.maintenance_requests 
FOR SELECT 
USING (has_role(auth.uid(), 'caretaker'));

-- Allow caretakers to create maintenance requests on behalf of tenants
CREATE POLICY "Caretakers can create maintenance requests" 
ON public.maintenance_requests 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'caretaker'));