/**
 * Wiki Intelligent Search API
 * 
 * POST /api/wiki/search
 * 
 * Searches through:
 * 1. Internal wiki_articles table (Supabase)
 * 2. Company policy documents (hardcoded policy catalog with keyword matching)
 * 3. AI-powered web knowledge via OpenAI
 * 
 * Returns combined results from internal docs + AI response
 */

import { createAdminClient } from '../../utils/intake'
import { logger } from '../../utils/logger'
import { serverSupabaseUser } from '#supabase/server'

interface SearchRequest {
  query: string
  mode: 'search' | 'ai' | 'both'
}

interface InternalResult {
  id: string
  title: string
  excerpt: string
  category: string
  source: 'wiki_article' | 'policy_document' | 'system_data'
  relevance: number
  url?: string
  content?: string
}

// Company policy document catalog for internal search
const POLICY_CATALOG: Array<{
  id: string
  title: string
  keywords: string[]
  category: string
  url: string
  excerpt: string
}> = [
  {
    id: 'policy-pto',
    title: 'GDD PTO/Sick Time/Unpaid Time Off Policy',
    keywords: ['pto', 'paid time off', 'time off', 'sick', 'sick time', 'sick day', 'vacation', 'unpaid', 'leave', 'absence', 'day off', 'days off', 'personal day', 'personal time'],
    category: 'HR Policy',
    url: 'https://docs.google.com/document/d/1J8nq-cy3eWrOuixB8dMRJzxa7xiWrIKXu39Rgc7yuJM/edit',
    excerpt: 'Green Dog Dental PTO, sick time, and unpaid time off policies including accrual rates, request procedures, and approval workflows.'
  },
  {
    id: 'policy-roles',
    title: 'Roles & Responsibilities Lists',
    keywords: ['role', 'roles', 'responsibility', 'responsibilities', 'job description', 'duties', 'position', 'job title'],
    category: 'Employee Development',
    url: 'https://docs.google.com/document/d/1OeZxk5pEDc4oHQxW0-QcCm41h2E-t9AWA4G_OQIV5pA/edit',
    excerpt: 'Comprehensive roles and responsibilities for all positions at Green Dog Dental.'
  },
  {
    id: 'policy-core-attributes',
    title: 'Core Attributes',
    keywords: ['core attributes', 'values', 'culture', 'core values', 'attributes', 'expectations', 'behavior', 'performance'],
    category: 'Employee Development',
    url: 'https://docs.google.com/document/d/12QrK1R-9QXiAx-nhuITHY-G6nmphEbbf1k6XarXYGX8/edit',
    excerpt: 'Green Dog Dental core attributes and values that define our workplace culture and expectations.'
  },
  {
    id: 'policy-compensation',
    title: 'Compensation Overview',
    keywords: ['compensation', 'pay', 'salary', 'wage', 'raise', 'bonus', 'benefits', 'hourly', 'annual', 'paycheck', 'payroll'],
    category: 'Employee Development',
    url: 'https://docs.google.com/document/d/1p9t2Pzpp7CkeayTM8H9FS5CBE-LoJ7s8c2U8KgrLOlU/edit',
    excerpt: 'Overview of compensation structure, pay scales, and benefits at Green Dog Dental.'
  },
  {
    id: 'policy-wellness',
    title: 'Employee Wellness',
    keywords: ['wellness', 'health', 'wellbeing', 'mental health', 'stress', 'burnout', 'self-care', 'employee assistance'],
    category: 'Employee Development',
    url: 'https://docs.google.com/document/d/1cU2bH6OM0AlWb-w-tb-6-HXih2U9ZpiuDPHAV4LVzT8/edit',
    excerpt: 'Employee wellness programs, mental health resources, and wellbeing initiatives at Green Dog Dental.'
  },
  {
    id: 'policy-protocols',
    title: 'GDD Master Protocols Sheet',
    keywords: ['protocol', 'protocols', 'procedure', 'procedures', 'standard', 'standards', 'sop', 'guidelines', 'workflow', 'process'],
    category: 'HR / Protocols',
    url: 'https://docs.google.com/document/d/1m_b6JW0ORuDbWrD_3i9jdLKGKpw1Lt02Odyan3fX5tI/edit',
    excerpt: 'Master list of all standard operating procedures and protocols for Green Dog Dental operations.'
  },
  {
    id: 'policy-ce',
    title: 'GDD Continuing Education Policy',
    keywords: ['continuing education', 'ce', 'training', 'certification', 'professional development', 'learning', 'education', 'course', 'class'],
    category: 'HR / Protocols',
    url: 'https://docs.google.com/document/d/1RnIB7gLo_BdHgAj-79r8W1DFSF5jMdGEaCxcx8PfYW8/edit',
    excerpt: 'Continuing education requirements, reimbursement policies, and approved programs for Green Dog Dental staff.'
  },
  {
    id: 'policy-respectful-workplace',
    title: 'GDD Respectful Workplace Policy',
    keywords: ['respectful', 'workplace', 'conduct', 'behavior', 'professionalism', 'respect', 'code of conduct', 'professional'],
    category: 'HR / Protocols',
    url: 'https://docs.google.com/document/d/1q9JjdcQnsA8lHQlWGjQyg0I2z7TqWw5h/edit',
    excerpt: 'Respectful workplace expectations, professional conduct standards, and communication guidelines.'
  },
  {
    id: 'policy-pet',
    title: 'GDD Employee Pet Policy',
    keywords: ['pet', 'pet policy', 'employee pet', 'bring pet', 'animal', 'dog at work', 'pet discount', 'pet benefit'],
    category: 'HR / Protocols',
    url: 'https://docs.google.com/document/d/1QoMgpOhzGwVCjM6NiC4E1MaahDGhyORmHzCYX5Rd-Ps/edit',
    excerpt: 'Employee pet policies including pet discounts, bringing pets to work, and pet-related benefits.'
  },
  {
    id: 'policy-safety',
    title: 'Safety Manual',
    keywords: ['safety', 'safe', 'hazard', 'osha', 'injury', 'accident', 'emergency', 'first aid', 'ppe', 'protective equipment'],
    category: 'Safety',
    url: 'https://docs.google.com/document/d/10WHDG-7kplVDYcQa4MDfLLZqsJHeyQF1/edit',
    excerpt: 'Comprehensive safety manual covering workplace safety protocols, hazard identification, and emergency procedures.'
  },
  {
    id: 'policy-pregnancy',
    title: 'Pregnancy Safety',
    keywords: ['pregnancy', 'pregnant', 'maternity', 'expecting', 'prenatal', 'radiation', 'x-ray safety', 'accommodation'],
    category: 'Safety',
    url: 'https://docs.google.com/document/d/1G-rfxGC2zsEFShFeSen7CsbqjUAAy_Cn/edit',
    excerpt: 'Safety guidelines and accommodations for pregnant employees, including radiation safety and modified duties.'
  },
  {
    id: 'policy-urgent-care',
    title: 'GDD Urgent Care Locations and Injury Protocol',
    keywords: ['urgent care', 'injury', 'hurt', 'injured', 'medical', 'clinic', 'worker comp', 'workers compensation', 'work injury', 'accident'],
    category: 'Safety',
    url: 'https://docs.google.com/document/d/1_pqe4NlBTIy3ZYS1Y5obP_vAZfu-oWjnIJEnS9v8OKQ/edit',
    excerpt: 'Urgent care locations, injury reporting procedures, and workers compensation protocol for workplace injuries.'
  },
  {
    id: 'policy-hazard',
    title: 'Hazard Reporting Form',
    keywords: ['hazard', 'danger', 'report', 'reporting', 'unsafe', 'risk', 'concern', 'safety concern'],
    category: 'Safety',
    url: 'https://docs.google.com/document/d/1qbre_4ymIMle3lf7pg1Tr87r3ULZ8ZN9/edit',
    excerpt: 'Form and procedures for reporting workplace hazards, unsafe conditions, and safety concerns.'
  },
  {
    id: 'policy-review',
    title: 'Review Process Policy',
    keywords: ['review', 'performance review', 'evaluation', 'appraisal', 'feedback', 'performance', 'annual review', '90 day', 'probation'],
    category: 'HR / Protocols',
    url: 'https://docs.google.com/document/d/1brfUtwLOMU14MFx_25-sfrgbGvVOX2X27D9-ZnJuxTE/edit',
    excerpt: 'Performance review process including timelines, evaluation criteria, and feedback procedures.'
  },
  {
    id: 'policy-harassment',
    title: 'GDD Harassment Policy',
    keywords: ['harassment', 'discrimination', 'hostile', 'complaint', 'report harassment', 'sexual harassment', 'bullying'],
    category: 'HR / Protocols',
    url: 'https://docs.google.com/document/d/1LxdmlY1mS4e8xzzO0KOtnieOYqJt4BbAJcZTC34JQ7Y/edit',
    excerpt: 'Anti-harassment policy including definitions, reporting procedures, and investigation process.'
  },
  {
    id: 'policy-relationships',
    title: 'GDD Workplace Relationships Policy',
    keywords: ['relationship', 'dating', 'fraternization', 'workplace relationship', 'romantic', 'personal relationship'],
    category: 'HR / Protocols',
    url: 'https://docs.google.com/document/d/1-WESyPVBW8Jt-oZCR7-qpdKtdVl-9oz31uynSC_w8KQ/edit',
    excerpt: 'Guidelines for workplace relationships including disclosure requirements and conflict of interest policies.'
  },
  {
    id: 'policy-covid',
    title: 'Employee Covid Protocol',
    keywords: ['covid', 'coronavirus', 'pandemic', 'quarantine', 'isolation', 'positive test', 'exposure', 'mask', 'vaccination'],
    category: 'HR / Protocols',
    url: 'https://docs.google.com/document/d/1oVnI1U_sgFZ9Y54TzQevoLLliuK8TCzGQsAjCPyzgxc/edit',
    excerpt: 'COVID-19 workplace protocols including testing, quarantine procedures, and return-to-work guidelines.'
  },
  {
    id: 'policy-discounts',
    title: 'GDD Non-Employee Discounts',
    keywords: ['discount', 'non-employee', 'friend', 'family', 'discount policy', 'pricing', 'special rate'],
    category: 'HR / Protocols',
    url: 'https://docs.google.com/document/d/19CZDbS73rDokbLlu2iGc1-VfAm4cYzcK/edit',
    excerpt: 'Discount policies for non-employees including friends and family rates and approval procedures.'
  },
  {
    id: 'policy-callouts',
    title: 'Call Outs and Tardiness Policy',
    keywords: ['call out', 'callout', 'tardy', 'tardiness', 'late', 'no show', 'no-show', 'absent', 'attendance', 'call in', 'calling out'],
    category: 'Disciplinary',
    url: 'https://docs.google.com/document/d/1OERyRhaB-_e70jWw4pYGsUrbeje1GP1m/edit',
    excerpt: 'Attendance expectations, call-out procedures, tardiness policies, and disciplinary steps.'
  },
  {
    id: 'policy-disciplinary',
    title: 'GDD Disciplinary Policy',
    keywords: ['disciplinary', 'discipline', 'write up', 'writeup', 'warning', 'termination', 'fired', 'suspension', 'progressive discipline', 'corrective action'],
    category: 'Disciplinary',
    url: 'https://docs.google.com/document/d/disciplinary-policy',
    excerpt: 'Progressive disciplinary policy including verbal warnings, written warnings, and termination procedures.'
  }
]

function searchPolicies(query: string): InternalResult[] {
  const q = query.toLowerCase().trim()
  const queryWords = q.split(/\s+/)
  
  const results: InternalResult[] = []
  
  for (const policy of POLICY_CATALOG) {
    let relevance = 0
    
    // Check exact keyword matches
    for (const keyword of policy.keywords) {
      if (q.includes(keyword)) {
        relevance += 10
      }
      // Partial word match
      for (const word of queryWords) {
        if (word.length >= 3 && keyword.includes(word)) {
          relevance += 3
        }
      }
    }
    
    // Check title match
    const titleLower = policy.title.toLowerCase()
    if (titleLower.includes(q)) {
      relevance += 15
    }
    for (const word of queryWords) {
      if (word.length >= 3 && titleLower.includes(word)) {
        relevance += 5
      }
    }
    
    // Check excerpt match
    if (policy.excerpt.toLowerCase().includes(q)) {
      relevance += 5
    }
    
    if (relevance > 0) {
      results.push({
        id: policy.id,
        title: policy.title,
        excerpt: policy.excerpt,
        category: policy.category,
        source: 'policy_document',
        relevance,
        url: policy.url
      })
    }
  }
  
  return results.sort((a, b) => b.relevance - a.relevance)
}

export default defineEventHandler(async (event) => {
  // Require authentication
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  const body = await readBody<SearchRequest>(event)
  
  if (!body?.query?.trim()) {
    throw createError({ statusCode: 400, message: 'Search query is required' })
  }
  
  const query = body.query.trim()
  const mode = body.mode || 'both'
  
  const results: {
    internalResults: InternalResult[]
    aiResponse: string | null
    totalInternalHits: number
  } = {
    internalResults: [],
    aiResponse: null,
    totalInternalHits: 0
  }
  
  try {
    // 1. Search internal wiki_articles table
    const client = createAdminClient()
    
    // Escape special PostgREST characters in search input
    const safeQuery = query.replace(/[%_.,()]/g, '')
    const { data: wikiArticles } = await client
      .from('wiki_articles')
      .select('id, title, content, category, tags')
      .eq('is_published', true)
      .or(`title.ilike.%${safeQuery}%,content.ilike.%${safeQuery}%,category.ilike.%${safeQuery}%`)
      .limit(10)
    
    if (wikiArticles?.length) {
      for (const article of wikiArticles) {
        // Calculate relevance
        let relevance = 0
        const q = query.toLowerCase()
        if (article.title?.toLowerCase().includes(q)) relevance += 15
        if (article.category?.toLowerCase().includes(q)) relevance += 10
        if (article.content?.toLowerCase().includes(q)) relevance += 5
        if (article.tags?.some((t: string) => t.toLowerCase().includes(q))) relevance += 8
        
        results.internalResults.push({
          id: article.id,
          title: article.title,
          excerpt: article.content?.substring(0, 200) + '...',
          category: article.category,
          source: 'wiki_article',
          relevance,
          content: article.content
        })
      }
    }
    
    // 2. Search company policy documents
    const policyResults = searchPolicies(query)
    results.internalResults.push(...policyResults)
    
    // 2b. Search facility resources
    const { data: facilityResults } = await client
      .from('facility_resources')
      .select('id, name, company_name, resource_type, phone, email, notes')
      .eq('is_active', true)
      .or(`name.ilike.%${safeQuery}%,company_name.ilike.%${safeQuery}%,resource_type.ilike.%${safeQuery}%,notes.ilike.%${safeQuery}%`)
      .limit(10)
    
    if (facilityResults?.length) {
      for (const fr of facilityResults) {
        let relevance = 0
        const q = query.toLowerCase()
        if (fr.name?.toLowerCase().includes(q)) relevance += 15
        if (fr.resource_type?.toLowerCase().includes(q)) relevance += 10
        if (fr.company_name?.toLowerCase().includes(q)) relevance += 8
        if (fr.notes?.toLowerCase().includes(q)) relevance += 3
        
        const typeName = fr.resource_type?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Vendor'
        results.internalResults.push({
          id: fr.id,
          title: fr.name || fr.company_name || 'Facility Vendor',
          excerpt: [typeName, fr.phone, fr.email].filter(Boolean).join(' · ') + (fr.notes ? ` — ${fr.notes.substring(0, 100)}` : ''),
          category: 'Facility Resources',
          source: 'system_data',
          relevance
        })
      }
    }
    
    // 2c. Search medical partners
    const { data: partnerResults } = await client
      .from('med_ops_partners')
      .select('id, name, category, description, contact_name, contact_email, contact_phone, website, products')
      .eq('is_active', true)
      .or(`name.ilike.%${safeQuery}%,category.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%,contact_name.ilike.%${safeQuery}%`)
      .limit(10)
    
    if (partnerResults?.length) {
      for (const mp of partnerResults) {
        let relevance = 0
        const q = query.toLowerCase()
        if (mp.name?.toLowerCase().includes(q)) relevance += 15
        if (mp.category?.toLowerCase().includes(q)) relevance += 10
        if (mp.description?.toLowerCase().includes(q)) relevance += 5
        if (mp.contact_name?.toLowerCase().includes(q)) relevance += 3
        if (mp.products?.some((p: string) => p.toLowerCase().includes(q))) relevance += 8
        
        results.internalResults.push({
          id: mp.id,
          title: mp.name || 'Medical Partner',
          excerpt: [mp.category, mp.description?.substring(0, 120)].filter(Boolean).join(' — ') + (mp.contact_name ? ` · Contact: ${mp.contact_name}` : ''),
          category: 'Medical Partners',
          source: 'system_data',
          relevance
        })
      }
    }
    
    // 3. Sort all internal results by relevance
    results.internalResults.sort((a, b) => b.relevance - a.relevance)
    results.totalInternalHits = results.internalResults.length
    
    // 4. AI-powered response (if mode is 'ai' or 'both')
    if (mode === 'ai' || mode === 'both') {
      const config = useRuntimeConfig()
      const apiKey = config.openaiApiKey
      const baseUrl = config.openaiBaseUrl || 'https://api.openai.com/v1'
      
      if (apiKey) {
        try {
          // Build context from internal results for AI
          let internalContext = ''
          if (results.internalResults.length > 0) {
            internalContext = '\n\nRELEVANT INTERNAL DOCUMENTS FOUND:\n'
            for (const r of results.internalResults.slice(0, 5)) {
              internalContext += `- ${r.title} (${r.category}): ${r.excerpt}\n`
            }
          }
          
          const systemPrompt = `You are the Green Dog Dental (GDD) Knowledge Assistant. You help employees find information about company policies, veterinary medical knowledge, workplace procedures, and general questions.

When answering:
1. If internal company documents were found that are relevant, ALWAYS reference them first and prominently.
2. Clearly distinguish between internal GDD policies/documents and general knowledge.
3. For medical/veterinary questions, provide evidence-based information.
4. Always be helpful, accurate, and professional.
5. Format responses with clear headers and bullet points.
6. If a company policy document is relevant, mention it by name and say the employee can click on it in the results below.

${internalContext}`

          const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: config.openaiModel || 'gpt-4o-mini',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: query }
              ],
              max_tokens: 1500,
              temperature: 0.4,
            }),
          })
          
          if (response.ok) {
            const data = await response.json() as {
              choices: Array<{ message: { content: string } }>
              usage?: { total_tokens: number; prompt_tokens: number; completion_tokens: number }
            }
            results.aiResponse = data.choices?.[0]?.message?.content ?? null
            
            // Log AI usage
            const tokensUsed = data.usage?.total_tokens ?? 0
            const costUsd = (tokensUsed / 1000) * 0.0003
            client.from('ai_usage_log').insert({
              feature: 'wiki:search',
              model: config.openaiModel || 'gpt-4o-mini',
              tokens_used: tokensUsed,
              prompt_tokens: data.usage?.prompt_tokens ?? 0,
              completion_tokens: data.usage?.completion_tokens ?? 0,
              cost_usd: costUsd,
              duration_ms: 0,
              success: true,
              metadata: { query },
            }).then(() => {})
          }
        } catch (aiErr) {
          logger.error('Wiki AI search failed', aiErr, 'wiki-search')
          // Don't fail the whole request if AI fails - still return internal results
        }
      }
    }
  } catch (err) {
    logger.error('Wiki search error', err, 'wiki-search')
    throw createError({ statusCode: 500, message: 'Search failed' })
  }
  
  return results
})
