import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface CreateTenantRequest {
  email: string
  password: string
  full_name: string
  phone?: string
  national_id?: string
  next_of_kin?: string
  unit_id?: string
  move_in_date?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Verify the requesting user is admin or caretaker
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Invalid token')
    }

    // Check if user has admin or caretaker role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || !roleData) {
      throw new Error('User role not found')
    }

    if (roleData.role !== 'admin' && roleData.role !== 'caretaker') {
      throw new Error('Unauthorized: Only admin or caretaker can create tenants')
    }

    const body: CreateTenantRequest = await req.json()
    
    if (!body.email || !body.password || !body.full_name) {
      throw new Error('Email, password, and full name are required')
    }

    if (body.password.length < 6) {
      throw new Error('Password must be at least 6 characters')
    }

    console.log('Creating tenant with email:', body.email)

    // Create user with admin API (bypasses email confirmation)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: body.full_name,
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      throw new Error(authError.message)
    }

    if (!authData.user) {
      throw new Error('Failed to create user')
    }

    console.log('User created:', authData.user.id)

    // Create profile with must_change_password flag
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name: body.full_name,
        email: body.email,
        phone: body.phone || null,
        national_id: body.national_id || null,
        next_of_kin: body.next_of_kin || null,
        must_change_password: true, // Force password change on first login
      })

    if (profileError) {
      console.error('Profile error:', profileError)
      // Cleanup: delete the created user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw new Error('Failed to create profile: ' + profileError.message)
    }

    console.log('Profile created')

    // Create user role as tenant
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'tenant',
      })

    if (roleInsertError) {
      console.error('Role error:', roleInsertError)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw new Error('Failed to assign role: ' + roleInsertError.message)
    }

    console.log('Role assigned')

    // Create tenant record
    const { data: tenantData, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        user_id: authData.user.id,
        unit_id: body.unit_id || null,
        move_in_date: body.move_in_date || null,
      })
      .select()
      .single()

    if (tenantError) {
      console.error('Tenant error:', tenantError)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw new Error('Failed to create tenant: ' + tenantError.message)
    }

    console.log('Tenant record created:', tenantData.id)

    // Update unit status to occupied if unit was selected
    if (body.unit_id) {
      const { error: unitError } = await supabaseAdmin
        .from('units')
        .update({ status: 'occupied' })
        .eq('id', body.unit_id)

      if (unitError) {
        console.error('Unit update error:', unitError)
        // Don't fail the whole operation, just log it
      } else {
        console.log('Unit status updated')
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        tenant_id: tenantData.id,
        user_id: authData.user.id,
        message: 'Tenant created successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    console.error('Error:', errorMessage)
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})