import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MpesaC2BCallback {
  TransactionType: string
  TransID: string
  TransTime: string
  TransAmount: string
  BusinessShortCode: string
  BillRefNumber: string // This is the Account Number (Unit Number)
  InvoiceNumber: string
  OrgAccountBalance: string
  ThirdPartyTransID: string
  MSISDN: string // Phone number
  FirstName: string
  MiddleName: string
  LastName: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const callback: MpesaC2BCallback = await req.json()
    
    console.log('M-Pesa callback received:', JSON.stringify(callback))

    const transactionId = callback.TransID
    const amount = parseFloat(callback.TransAmount)
    const accountNumber = callback.BillRefNumber?.toUpperCase().trim()
    const phoneNumber = callback.MSISDN
    const transactionDate = parseTransactionTime(callback.TransTime)

    // Check for duplicate transaction
    const { data: existingTx } = await supabaseAdmin
      .from('mpesa_transactions')
      .select('id')
      .eq('transaction_id', transactionId)
      .single()

    if (existingTx) {
      console.log('Duplicate transaction:', transactionId)
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Try to find the unit by unit number (account number)
    const { data: unit, error: unitError } = await supabaseAdmin
      .from('units')
      .select('id, unit_number, property_id')
      .ilike('unit_number', accountNumber)
      .single()

    let tenantId: string | null = null
    let rentRecordId: string | null = null
    let matched = false
    let errorMessage: string | null = null

    if (unitError || !unit) {
      console.log('Unit not found for account number:', accountNumber)
      errorMessage = `Unit not found: ${accountNumber}`
    } else {
      // Find tenant assigned to this unit
      const { data: tenant, error: tenantError } = await supabaseAdmin
        .from('tenants')
        .select('id')
        .eq('unit_id', unit.id)
        .is('move_out_date', null)
        .single()

      if (tenantError || !tenant) {
        console.log('No active tenant for unit:', unit.id)
        errorMessage = `No active tenant for unit: ${accountNumber}`
      } else {
        tenantId = tenant.id
        
        // Find the current month's rent record
        const currentMonth = new Date().toISOString().slice(0, 7)
        const { data: rentRecord, error: rentError } = await supabaseAdmin
          .from('rent_records')
          .select('id, amount_due, amount_paid, status')
          .eq('tenant_id', tenant.id)
          .eq('month_year', currentMonth)
          .single()

        if (rentRecord) {
          rentRecordId = rentRecord.id
          matched = true

          // Calculate new payment status
          const newAmountPaid = Number(rentRecord.amount_paid) + amount
          const amountDue = Number(rentRecord.amount_due)
          let newStatus: 'paid' | 'partial' | 'pending' = 'pending'
          
          if (newAmountPaid >= amountDue) {
            newStatus = 'paid'
          } else if (newAmountPaid > 0) {
            newStatus = 'partial'
          }

          // Update rent record
          await supabaseAdmin
            .from('rent_records')
            .update({
              amount_paid: newAmountPaid,
              status: newStatus,
            })
            .eq('id', rentRecord.id)

          // Create payment record
          await supabaseAdmin
            .from('payments')
            .insert({
              rent_record_id: rentRecord.id,
              tenant_id: tenant.id,
              amount: amount,
              payment_method: 'mpesa',
              payment_date: transactionDate.toISOString().split('T')[0],
              reference_number: transactionId,
              notes: `M-Pesa payment from ${phoneNumber}`,
            })

          console.log('Payment recorded successfully for tenant:', tenant.id)
        } else {
          // No rent record for current month, still log the transaction
          errorMessage = `No rent record for current month for tenant`
        }
      }
    }

    // Store M-Pesa transaction for audit and reconciliation
    await supabaseAdmin
      .from('mpesa_transactions')
      .insert({
        transaction_id: transactionId,
        phone_number: phoneNumber,
        amount: amount,
        account_number: accountNumber,
        transaction_date: transactionDate.toISOString(),
        tenant_id: tenantId,
        rent_record_id: rentRecordId,
        status: matched ? 'completed' : 'pending_review',
        matched: matched,
        error_message: errorMessage,
        raw_payload: callback,
      })

    // Return success to M-Pesa
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('M-Pesa callback error:', errorMessage)
    
    // Still return success to M-Pesa to prevent retries
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  }
})

function parseTransactionTime(transTime: string): Date {
  // M-Pesa format: YYYYMMDDHHmmss
  const year = parseInt(transTime.substring(0, 4))
  const month = parseInt(transTime.substring(4, 6)) - 1
  const day = parseInt(transTime.substring(6, 8))
  const hour = parseInt(transTime.substring(8, 10))
  const minute = parseInt(transTime.substring(10, 12))
  const second = parseInt(transTime.substring(12, 14))
  
  return new Date(year, month, day, hour, minute, second)
}
