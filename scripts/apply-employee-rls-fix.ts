/**
 * Apply RLS policy to allow employees to update their own record
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_f8af710de6c6cd3cc8d230e31f14e684fddb8e39'
const PROJECT_REF = 'uekumyupkhnpjpdcjfxb'

async function applyMigration() {
  const sql = `
    -- Add self-update policy for employees (allows users to update their own record)
    DROP POLICY IF EXISTS "employees_self_update" ON public.employees;
    
    CREATE POLICY "employees_self_update"
    ON public.employees
    FOR UPDATE
    TO authenticated
    USING (
      profile_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    )
    WITH CHECK (
      profile_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    );

    -- Also ensure employee_licenses has proper insert/update policies for authenticated users
    DROP POLICY IF EXISTS "employee_licenses_self_insert" ON public.employee_licenses;
    DROP POLICY IF EXISTS "employee_licenses_self_update" ON public.employee_licenses;

    CREATE POLICY "employee_licenses_self_insert"
    ON public.employee_licenses
    FOR INSERT
    TO authenticated
    WITH CHECK (
      employee_id IN (
        SELECT e.id FROM public.employees e 
        JOIN public.profiles p ON e.profile_id = p.id 
        WHERE p.auth_user_id = auth.uid()
      )
    );

    CREATE POLICY "employee_licenses_self_update"
    ON public.employee_licenses
    FOR UPDATE
    TO authenticated
    USING (
      employee_id IN (
        SELECT e.id FROM public.employees e 
        JOIN public.profiles p ON e.profile_id = p.id 
        WHERE p.auth_user_id = auth.uid()
      )
    )
    WITH CHECK (
      employee_id IN (
        SELECT e.id FROM public.employees e 
        JOIN public.profiles p ON e.profile_id = p.id 
        WHERE p.auth_user_id = auth.uid()
      )
    );
  `

  // Use Supabase Management API to run SQL
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    }
  )

  if (!response.ok) {
    const text = await response.text()
    console.error('Failed:', response.status, text)
    process.exit(1)
  }

  const result = await response.json()
  console.log('Migration applied successfully:', result)
}

applyMigration().catch(console.error)
