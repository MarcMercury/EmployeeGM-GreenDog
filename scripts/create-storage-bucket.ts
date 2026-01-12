/**
 * Script to create the intake-documents storage bucket in Supabase
 * 
 * Run with: npx tsx scripts/create-storage-bucket.ts
 * 
 * Note: This requires SUPABASE_SERVICE_ROLE_KEY to be set in .env
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
  console.log('You can also create the bucket manually in the Supabase Dashboard:')
  console.log('1. Go to Storage in your Supabase project')
  console.log('2. Click "New bucket"')
  console.log('3. Name it "intake-documents"')
  console.log('4. Make sure "Public bucket" is OFF')
  console.log('5. Set file size limit to 10MB')
  console.log('6. Set allowed MIME types to: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, image/jpeg, image/png')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createBucket() {
  console.log('🗄️  Creating intake-documents storage bucket...')
  console.log(`   Supabase URL: ${supabaseUrl}`)

  // Check if bucket already exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()
  
  if (listError) {
    console.error('❌ Failed to list buckets:', listError.message)
    process.exit(1)
  }

  const existingBucket = buckets?.find(b => b.id === 'intake-documents')
  
  if (existingBucket) {
    console.log('✅ Bucket "intake-documents" already exists')
    console.log('   Created:', existingBucket.created_at)
    console.log('   Public:', existingBucket.public)
    return
  }

  // Create the bucket
  const { data, error } = await supabase.storage.createBucket('intake-documents', {
    public: false, // Private bucket - requires auth or signed URLs
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png'
    ]
  })

  if (error) {
    console.error('❌ Failed to create bucket:', error.message)
    process.exit(1)
  }

  console.log('✅ Bucket "intake-documents" created successfully!')
  console.log('   Name:', data.name)
  console.log('')
  console.log('📋 Next steps:')
  console.log('   1. Run the migration to add storage policies:')
  console.log('      npx supabase db push')
  console.log('   2. Verify the bucket in your Supabase Dashboard')
}

createBucket().catch(console.error)
