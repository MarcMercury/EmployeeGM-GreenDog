/**
 * Slack/EmployeeGM Email Match Script
 * ===================================
 * Fetches all Slack users (via Slack API) and all EmployeeGM users (profiles/employees),
 * compares emails, and outputs matches, EmployeeGM-only, and Slack-only users.
 *
 * Output: CSV and JSON files for admin review.
 *
 * Usage: Run as a Node script or via Nuxt server API for admin.
 */


import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function fetchSlackUsers() {
  const users: any[] = []
  let cursor: string | undefined = undefined
  do {
    const url = new URL('https://slack.com/api/users.list')
    if (cursor) url.searchParams.set('cursor', cursor)
    url.searchParams.set('limit', '200')
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` }
    })
    const data = await res.json()
    if (!data.ok) throw new Error(data.error)
    users.push(...data.members)
    cursor = data.response_metadata?.next_cursor || undefined
  } while (cursor)
  return users
}

async function fetchEmployeeGMUsers() {
  // Fetch from profiles and employees, join on profile_id
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role, slack_user_id')
  if (pErr) throw pErr
  const { data: employees, error: eErr } = await supabase
    .from('employees')
    .select('id, profile_id, email_work, email_personal, first_name, last_name, slack_user_id')
  if (eErr) throw eErr
  return { profiles, employees }
}

function normalizeEmail(email: string | null | undefined) {
  return (email || '').trim().toLowerCase()
}

function compareUsers(slackUsers: any[], profiles: any[], employees: any[]) {
  // Build lookup maps
  const slackByEmail = new Map<string, any>()
  for (const u of slackUsers) {
    const email = normalizeEmail(u.profile?.email)
    if (email) slackByEmail.set(email, u)
  }
  const employeeByEmail = new Map<string, any>()
  for (const e of employees) {
    if (e.email_work) employeeByEmail.set(normalizeEmail(e.email_work), e)
    if (e.email_personal) employeeByEmail.set(normalizeEmail(e.email_personal), e)
  }
  const profileByEmail = new Map<string, any>()
  for (const p of profiles) {
    profileByEmail.set(normalizeEmail(p.email), p)
  }

  // Matches: email in both Slack and EmployeeGM
  const matches: any[] = []
  for (const [email, slackUser] of slackByEmail.entries()) {
    const emp = employeeByEmail.get(email)
    const prof = profileByEmail.get(email)
    if (emp || prof) {
      matches.push({
        email,
        slack: {
          id: slackUser.id,
          name: slackUser.real_name,
          display: slackUser.profile?.display_name,
        },
        employee: emp ? { id: emp.id, first_name: emp.first_name, last_name: emp.last_name } : null,
        profile: prof ? { id: prof.id, first_name: prof.first_name, last_name: prof.last_name, role: prof.role } : null
      })
    }
  }
  // EmployeeGM-only
  const employeeOnly: any[] = []
  for (const [email, emp] of employeeByEmail.entries()) {
    if (!slackByEmail.has(email)) {
      employeeOnly.push({ email, ...emp })
    }
  }
  for (const [email, prof] of profileByEmail.entries()) {
    if (!slackByEmail.has(email) && !employeeByEmail.has(email)) {
      employeeOnly.push({ email, ...prof })
    }
  }
  // Slack-only
  const slackOnly: any[] = []
  for (const [email, slackUser] of slackByEmail.entries()) {
    if (!employeeByEmail.has(email) && !profileByEmail.has(email)) {
      slackOnly.push({ email, ...slackUser })
    }
  }
  return { matches, employeeOnly, slackOnly }
}

function toCSV(arr: any[], fields: string[]): string {
  const header = fields.join(',')
  const rows = arr.map(obj => fields.map(f => JSON.stringify(obj[f] ?? '')).join(','))
  return [header, ...rows].join('\n')
}

async function main() {
  const slackUsers = await fetchSlackUsers()
  const { profiles, employees } = await fetchEmployeeGMUsers()
  const { matches, employeeOnly, slackOnly } = compareUsers(slackUsers, profiles, employees)

  // Write JSON
  fs.writeFileSync(path.join(__dirname, 'slack-employee-matches.json'), JSON.stringify({ matches, employeeOnly, slackOnly }, null, 2))
  // Write CSVs
  fs.writeFileSync(path.join(__dirname, 'slack-employee-matches.csv'), toCSV(matches, ['email', 'slack', 'employee', 'profile']))
  fs.writeFileSync(path.join(__dirname, 'employee-only.csv'), toCSV(employeeOnly, ['email', 'id', 'first_name', 'last_name']))
  fs.writeFileSync(path.join(__dirname, 'slack-only.csv'), toCSV(slackOnly, ['email', 'id', 'real_name', 'profile']))
  console.log('Done! Output written to slack-employee-matches.json/csv, employee-only.csv, slack-only.csv')
}

main().catch(e => { console.error(e); process.exit(1) })
