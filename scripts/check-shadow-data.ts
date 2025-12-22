import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check education_visitors with shadow programs
  const { data: visitors, error: vErr } = await supabase
    .from('education_visitors')
    .select('id, first_name, last_name, email, program_name, visitor_type, is_active, created_at')
    .or('program_name.ilike.%shadow%,program_name.ilike.%interviewee%,visitor_type.eq.shadow')
    .order('created_at', { ascending: false });

  console.log('=== SHADOW VISITORS IN EDUCATION_VISITORS ===');
  console.log('Count:', visitors?.length);
  if (vErr) console.log('Error:', vErr.message);
  visitors?.forEach(v => console.log(`  [${v.is_active ? 'ACTIVE' : 'inactive'}] ${v.first_name} ${v.last_name} - ${v.program_name || v.visitor_type} (id: ${v.id})`));

  // Check candidates table for shadow source
  const { data: candidates, error: cErr } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, email, source, status, applied_at')
    .or('source.ilike.%shadow%,source.ilike.%interviewee%,notes.ilike.%shadow%')
    .order('applied_at', { ascending: false });

  console.log('\n=== SHADOW CANDIDATES IN CANDIDATES TABLE ===');
  console.log('Count:', candidates?.length);
  if (cErr) console.log('Error:', cErr.message);
  candidates?.forEach(c => console.log(`  [${c.status}] ${c.first_name} ${c.last_name} - source: ${c.source}`));

  // Check all candidates
  const { data: allCandidates } = await supabase
    .from('candidates')
    .select('id, first_name, last_name, source, status')
    .order('applied_at', { ascending: false })
    .limit(20);

  console.log('\n=== RECENT 20 CANDIDATES ===');
  allCandidates?.forEach(c => console.log(`  [${c.status}] ${c.first_name} ${c.last_name} - source: ${c.source || 'N/A'}`));
}

main().catch(console.error);
