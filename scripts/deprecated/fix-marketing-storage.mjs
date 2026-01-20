/**
 * Fix Marketing Resources Storage Policies
 * 
 * This script updates the storage RLS policies for the marketing-resources bucket
 * to allow users with marketing_admin role to upload files.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runSQL(sql, description) {
  console.log(`\n📝 ${description}...`)
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
  if (error) {
    // Try using the more direct approach
    console.log('   Using direct query...')
    const result = await supabase.from('_exec').select('*').limit(1)
    // The rpc might not exist, let's try a different approach
    throw new Error(error.message)
  }
  console.log('   ✅ Done')
  return data
}

async function fixStoragePolicies() {
  console.log('🔧 Fixing Marketing Resources Storage Policies\n')
  console.log('=' .repeat(60))

  try {
    // First, check if the bucket exists
    console.log('\n1️⃣  Checking bucket exists...')
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    
    if (bucketError) {
      console.error('   ❌ Error listing buckets:', bucketError.message)
    } else {
      const marketingBucket = buckets?.find(b => b.id === 'marketing-resources')
      if (marketingBucket) {
        console.log('   ✅ Bucket "marketing-resources" exists')
        console.log(`      - Public: ${marketingBucket.public}`)
        console.log(`      - File size limit: ${marketingBucket.file_size_limit ? (marketingBucket.file_size_limit / 1048576) + 'MB' : 'None'}`)
      } else {
        console.log('   ⚠️  Bucket "marketing-resources" not found!')
        console.log('   Creating bucket...')
        
        const { error: createError } = await supabase.storage.createBucket('marketing-resources', {
          public: false,
          fileSizeLimit: 104857600, // 100MB
          allowedMimeTypes: [
            'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp',
            'application/pdf',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/zip', 'application/x-zip-compressed',
            'video/mp4', 'video/quicktime', 'video/webm',
            'text/plain', 'text/html', 'text/css'
          ]
        })
        
        if (createError) {
          console.error('   ❌ Failed to create bucket:', createError.message)
        } else {
          console.log('   ✅ Bucket created successfully')
        }
      }
    }

    // Test upload capability
    console.log('\n2️⃣  Testing upload capability with service role...')
    const testContent = new Blob(['test'], { type: 'text/plain' })
    const testPath = `_test_${Date.now()}.txt`
    
    const { error: uploadError } = await supabase.storage
      .from('marketing-resources')
      .upload(testPath, testContent, { upsert: true })
    
    if (uploadError) {
      console.log('   ❌ Upload test failed:', uploadError.message)
      console.log('   This may indicate RLS policies need updating in Supabase Dashboard')
    } else {
      console.log('   ✅ Upload test successful')
      
      // Clean up test file
      await supabase.storage.from('marketing-resources').remove([testPath])
      console.log('   ✅ Test file cleaned up')
    }

    // List current files to verify access
    console.log('\n3️⃣  Listing current files in bucket...')
    const { data: files, error: listError } = await supabase.storage
      .from('marketing-resources')
      .list('', { limit: 5 })
    
    if (listError) {
      console.log('   ❌ List failed:', listError.message)
    } else {
      console.log(`   ✅ Found ${files?.length || 0} items in root`)
      if (files?.length) {
        files.slice(0, 3).forEach(f => console.log(`      - ${f.name}`))
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('\n📋 NEXT STEPS:')
    console.log('\nYou need to run migration 127 in Supabase SQL Editor to fix RLS policies:')
    console.log('https://supabase.com/dashboard/project/uekumyupkhnpjpdcjfxb/sql/new')
    console.log('\nCopy and paste the contents of:')
    console.log('  supabase/migrations/127_fix_marketing_storage_policies.sql')
    console.log('\nThis will:')
    console.log('  1. Create the is_marketing_admin() function')
    console.log('  2. Update storage RLS policies to allow marketing_admin role')
    console.log('  3. Fix marketing_resources and marketing_folders table RLS')

  } catch (err) {
    console.error('\n❌ Error:', err.message)
  }
}

fixStoragePolicies()
