/**
 * COMPREHENSIVE AUTHENTICATED FRONT-END AUDIT v3
 * - Logs in via Supabase magic link (admin user)
 * - Creates a fresh page per route (no crash cascading)
 * - Batch processing with pauses to prevent OOM
 * - Tests buttons, forms, console errors, JS exceptions, network failures
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const BASE = 'http://localhost:3000';
const BATCH_SIZE = 5;
const INTER_PAGE_DELAY = 1000;
const INTER_BATCH_DELAY = 3000;
const PAGE_TIMEOUT = 30000;
const SPA_SETTLE = 3000;

const SUPABASE_URL = 'https://uekumyupkhnpjpdcjfxb.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVla3VteXVwa2hucGpwZGNqZnhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA5NTYzMiwiZXhwIjoyMDgwNjcxNjMyfQ.zAUg6sayz3TYhw9eeo3hrFA5sytlSYybQAypKKOaoL4';
const ADMIN_EMAIL = 'rendvm@gmail.com';

const ALL_ROUTES = [
  // ─── Public / Auth ────────────────────────────
  { path: '/auth/login', section: 'Auth', public: true },
  { path: '/public/careers', section: 'Public', public: true },

  // ─── Dashboard / Core ─────────────────────────
  { path: '/', section: 'Dashboard' },
  { path: '/activity', section: 'Core' },
  { path: '/contact-list', section: 'Core' },
  { path: '/development', section: 'Core' },
  { path: '/export-payroll', section: 'Core' },
  { path: '/goals', section: 'Core' },
  { path: '/leads', section: 'Core' },
  { path: '/marketplace', section: 'Core' },
  { path: '/mentorship', section: 'Core' },
  { path: '/my-ops', section: 'Core' },
  { path: '/my-schedule', section: 'Core' },
  { path: '/profile', section: 'Core' },
  { path: '/reviews', section: 'Core' },
  { path: '/settings', section: 'Core' },
  { path: '/skills-library', section: 'Core' },
  { path: '/time-off', section: 'Core' },
  { path: '/wiki', section: 'Core' },

  // ─── Admin ────────────────────────────────────
  { path: '/admin/agents', section: 'Admin' },
  { path: '/admin/email-templates', section: 'Admin' },
  { path: '/admin/intake', section: 'Admin' },
  { path: '/admin/payroll/review', section: 'Admin' },
  { path: '/admin/scheduling-rules', section: 'Admin' },
  { path: '/admin/services', section: 'Admin' },
  { path: '/admin/skills-management', section: 'Admin' },
  { path: '/admin/slack', section: 'Admin' },
  { path: '/admin/system-health', section: 'Admin' },
  { path: '/admin/users', section: 'Admin' },

  // ─── Academy ──────────────────────────────────
  { path: '/academy', section: 'Academy' },
  { path: '/academy/catalog', section: 'Academy' },
  { path: '/academy/course-manager', section: 'Academy' },
  { path: '/academy/manager/create', section: 'Academy' },
  { path: '/academy/my-training', section: 'Academy' },
  { path: '/academy/signoffs', section: 'Academy' },

  // ─── Employees ────────────────────────────────
  { path: '/employees', section: 'Employees' },

  // ─── GDU ──────────────────────────────────────
  { path: '/gdu/events', section: 'GDU' },
  { path: '/gdu/events/new', section: 'GDU' },
  { path: '/gdu/students', section: 'GDU' },
  { path: '/gdu/visitors', section: 'GDU' },

  // ─── Growth ───────────────────────────────────
  { path: '/growth/events', section: 'Growth' },
  { path: '/growth/goals', section: 'Growth' },
  { path: '/growth/leads', section: 'Growth' },
  { path: '/growth/partners', section: 'Growth' },

  // ─── Marketing ────────────────────────────────
  { path: '/marketing', section: 'Marketing' },
  { path: '/marketing/appointment-analysis', section: 'Marketing' },
  { path: '/marketing/calendar', section: 'Marketing' },
  { path: '/marketing/command-center', section: 'Marketing' },
  { path: '/marketing/ezyvet-analytics', section: 'Marketing' },
  { path: '/marketing/ezyvet-integration', section: 'Marketing' },
  { path: '/marketing/influencers', section: 'Marketing' },
  { path: '/marketing/inventory', section: 'Marketing' },
  { path: '/marketing/invoice-analysis', section: 'Marketing' },
  { path: '/marketing/list-hygiene', section: 'Marketing' },
  { path: '/marketing/partners', section: 'Marketing' },
  { path: '/marketing/partnerships', section: 'Marketing' },
  { path: '/marketing/practice-analytics', section: 'Marketing' },
  { path: '/marketing/resources', section: 'Marketing' },
  { path: '/marketing/sauron', section: 'Marketing' },

  // ─── Med-Ops ──────────────────────────────────
  { path: '/med-ops/boards', section: 'Med-Ops' },
  { path: '/med-ops/calculators', section: 'Med-Ops' },
  { path: '/med-ops/facilities', section: 'Med-Ops' },
  { path: '/med-ops/partners', section: 'Med-Ops' },
  { path: '/med-ops/safety', section: 'Med-Ops' },
  { path: '/med-ops/safety/manage-types', section: 'Med-Ops' },
  { path: '/med-ops/safety/qr-codes', section: 'Med-Ops' },
  { path: '/med-ops/wiki', section: 'Med-Ops' },

  // ─── People ───────────────────────────────────
  { path: '/people/my-skills', section: 'People' },
  { path: '/people/skill-stats', section: 'People' },

  // ─── Recruiting ───────────────────────────────
  { path: '/recruiting', section: 'Recruiting' },
  { path: '/recruiting/candidates', section: 'Recruiting' },
  { path: '/recruiting/interviews', section: 'Recruiting' },
  { path: '/recruiting/onboarding', section: 'Recruiting' },

  // ─── Roster ───────────────────────────────────
  { path: '/roster', section: 'Roster' },

  // ─── Schedule ─────────────────────────────────
  { path: '/schedule', section: 'Schedule' },
  { path: '/schedule/builder', section: 'Schedule' },
  { path: '/schedule/services', section: 'Schedule' },
  { path: '/schedule/wizard', section: 'Schedule' },

  // ─── Training ─────────────────────────────────
  { path: '/training', section: 'Training' },
];

const SKIP_BUTTONS = [
  'delete', 'remove', 'destroy', 'logout', 'sign out', 'reset',
  'submit', 'save', 'confirm', 'approve', 'reject', 'send', 'publish',
  'archive', 'deactivate', 'terminate', 'cancel subscription',
];

// ════════════════════════════════════════════════
// Authenticate via magic link + Supabase JS
// ════════════════════════════════════════════════
async function authenticate(context) {
  console.log('🔐 Authenticating as admin...');
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Generate magic link
  const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
    type: 'magiclink',
    email: ADMIN_EMAIL,
  });
  if (linkErr) throw new Error(`Magic link failed: ${linkErr.message}`);

  const actionLink = linkData.properties?.action_link;
  if (!actionLink) throw new Error('No action_link returned');

  console.log(`   Magic link generated for ${ADMIN_EMAIL}`);

  // Open a page, navigate to the magic link (which verifies + redirects)
  const loginPage = await context.newPage();
  try {
    await loginPage.goto(actionLink, { waitUntil: 'networkidle', timeout: 30000 });
    await loginPage.waitForTimeout(3000);

    const finalUrl = loginPage.url();
    console.log(`   Post-login URL: ${finalUrl}`);

    // Check if we landed on a page that's NOT the login page
    if (finalUrl.includes('/auth/login')) {
      // Try to handle hash-based callback from Supabase
      // The magic link redirects to the app with tokens in the URL hash
      console.log('   Checking for token in hash...');
      const hash = await loginPage.evaluate(() => window.location.hash);
      console.log(`   Hash: ${hash ? hash.substring(0, 80) + '...' : '(none)'}`);
    }

    // Verify authentication by checking localStorage for Supabase session
    const session = await loginPage.evaluate(() => {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('supabase') && key.includes('auth')) {
          try {
            const val = JSON.parse(localStorage.getItem(key));
            if (val?.access_token || val?.user) return { found: true, key };
          } catch {}
        }
      }
      return { found: false };
    });

    if (session.found) {
      console.log(`   ✅ Session found in localStorage (key: ${session.key})`);
    } else {
      console.log('   ⚠️  No session in localStorage — trying direct Supabase token injection...');

      // Fallback: inject session via Supabase JS client in the browser
      const { data: sessionData, error: sessErr } = await sb.auth.admin.generateLink({
        type: 'magiclink',
        email: ADMIN_EMAIL,
      });

      // Use signInWithOtp trick or token directly
      // Actually, let's use admin.getUserById and create a session directly
      const { data: userList } = await sb.auth.admin.listUsers();
      const adminUser = userList.users.find(u => u.email === ADMIN_EMAIL);

      if (adminUser) {
        // Navigate to the app and inject the token
        await loginPage.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle', timeout: 15000 });
        await loginPage.waitForTimeout(2000);

        // Use the Supabase anon key to set up client-side auth
        const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVla3VteXVwa2hucGpwZGNqZnhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwOTU2MzIsImV4cCI6MjA4MDY3MTYzMn0.5iik5FKdA2rgFfK-IeRL7FAiE_wymiaSavD4b9EheTw';

        // Generate link and verify it to get tokens
        const { data: verifyData, error: verifyErr } = await sb.auth.admin.generateLink({
          type: 'magiclink',
          email: ADMIN_EMAIL,
        });

        if (verifyData?.properties?.hashed_token) {
          // Use the Supabase verifyOtp API with the token_hash
          const verifyResp = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON,
            },
            body: JSON.stringify({
              type: 'magiclink',
              token_hash: verifyData.properties.hashed_token,
            }),
          });

          if (verifyResp.ok) {
            const tokens = await verifyResp.json();
            console.log(`   Got tokens: access_token=${tokens.access_token?.substring(0,20)}...`);

            // Inject into the browser's localStorage
            await loginPage.evaluate((tokensStr) => {
              const tokens = JSON.parse(tokensStr);
              // Find the Supabase storage key
              const storageKey = `sb-uekumyupkhnpjpdcjfxb-auth-token`;
              localStorage.setItem(storageKey, JSON.stringify(tokens));
            }, JSON.stringify(tokens));

            // Navigate to test if auth works
            await loginPage.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 20000 });
            await loginPage.waitForTimeout(3000);

            const postAuthUrl = loginPage.url();
            console.log(`   Post-injection URL: ${postAuthUrl}`);

            if (!postAuthUrl.includes('/auth/login')) {
              console.log('   ✅ Authentication successful via token injection!');
            } else {
              console.log('   ⚠️  Still on login page after injection');
            }
          } else {
            console.log(`   ❌ Verify failed: ${verifyResp.status} ${verifyResp.statusText}`);
          }
        }
      }
    }
  } finally {
    await loginPage.close();
  }
}

async function auditOnePage(context, route, summary) {
  const result = {
    path: route.path,
    section: route.section,
    isPublic: route.public || false,
    status: 'unknown',
    httpStatus: null,
    loadTimeMs: 0,
    redirectedTo: null,
    finalUrl: null,
    consoleErrors: [],
    consoleWarnings: [],
    jsExceptions: [],
    networkErrors: [],
    buttons: { total: 0, clicked: 0, errors: [] },
    forms: 0,
    inputs: 0,
    tables: 0,
    vuetifyComponents: 0,
    brokenImages: [],
    pageTitle: '',
    bodyLength: 0,
    notes: [],
  };

  let page;
  try {
    page = await context.newPage();
  } catch (e) {
    result.status = 'browser-error';
    result.notes.push(`Could not create page: ${e.message}`);
    return result;
  }

  const consoleHandler = (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      if (text.includes('favicon') || text.includes('manifest') ||
          text.includes('__vite') || text.includes('hot-update') ||
          text.includes('net::ERR_ABORTED') || text.includes('DevTools')) return;
      result.consoleErrors.push(text.substring(0, 500));
    } else if (type === 'warning') {
      if (text.includes('[Vue warn]') || text.includes('DevTools') ||
          text.includes('Source map') || text.includes('download the Vue Devtools')) return;
      result.consoleWarnings.push(text.substring(0, 300));
    }
  };
  const errorHandler = (err) => {
    result.jsExceptions.push(err.message.substring(0, 500));
  };
  const networkHandler = (request) => {
    const url = request.url();
    if (url.includes('favicon') || url.includes('hot-update') ||
        url.includes('__vite_ping') || url.includes('__nuxt') ||
        url.includes('manifest.json') || url.includes('.map')) return;
    result.networkErrors.push({
      url: url.substring(0, 200),
      failure: request.failure()?.errorText || 'unknown',
    });
  };

  page.on('console', consoleHandler);
  page.on('pageerror', errorHandler);
  page.on('requestfailed', networkHandler);

  const startTime = Date.now();

  try {
    const response = await page.goto(`${BASE}${route.path}`, {
      waitUntil: 'networkidle',
      timeout: PAGE_TIMEOUT,
    });
    result.httpStatus = response?.status() || null;
    result.loadTimeMs = Date.now() - startTime;

    await page.waitForTimeout(SPA_SETTLE);

    const finalUrl = page.url();
    result.finalUrl = finalUrl;
    const finalPath = new URL(finalUrl).pathname;

    if (finalPath !== route.path) {
      result.redirectedTo = finalPath;
      if (finalPath === '/auth/login') {
        result.status = 'redirected-to-login';
        summary.redirectedToLogin++;
      } else {
        result.status = 'redirected';
        result.notes.push(`Redirected to: ${finalPath}`);
      }
    }

    // Page content audit
    const pageCheck = await page.evaluate(() => {
      const hasError = !!document.querySelector('.nuxt-error-page, #nuxt-error, [data-v-error]');
      const bodyText = document.body?.innerText?.trim() || '';
      const bodyLen = bodyText.length;
      const title = document.title || '';
      const vuetifyCount = document.querySelectorAll('[class*="v-"]').length;
      const btnCount = document.querySelectorAll('button, [role="button"], .v-btn').length;
      const formCount = document.querySelectorAll('form, .v-form').length;
      const inputCount = document.querySelectorAll('input, select, textarea, .v-select, .v-text-field, .v-autocomplete').length;
      const tableCount = document.querySelectorAll('table, .v-data-table, .v-table').length;
      const brokenImgs = Array.from(document.querySelectorAll('img'))
        .filter(i => i.naturalWidth === 0 && i.src)
        .map(i => i.src.substring(0, 100));
      const h1 = document.querySelector('h1')?.textContent?.trim()?.substring(0, 100) || '';
      const h2 = document.querySelector('h2')?.textContent?.trim()?.substring(0, 100) || '';
      return { hasError, bodyLen, title, vuetifyCount, btnCount, formCount, inputCount, tableCount, brokenImgs, h1, h2 };
    });

    result.vuetifyComponents = pageCheck.vuetifyCount;
    result.buttons.total = pageCheck.btnCount;
    result.forms = pageCheck.formCount;
    result.inputs = pageCheck.inputCount;
    result.tables = pageCheck.tableCount;
    result.brokenImages = pageCheck.brokenImgs;
    result.pageTitle = pageCheck.title;
    result.bodyLength = pageCheck.bodyLen;
    summary.buttonsFound += pageCheck.btnCount;
    summary.formsFound += pageCheck.formCount;

    if (pageCheck.h1) result.notes.push(`H1: ${pageCheck.h1}`);
    if (pageCheck.hasError) result.notes.push('ERROR OVERLAY DETECTED');
    if (pageCheck.bodyLen < 10 && result.status !== 'redirected-to-login') {
      result.notes.push('PAGE APPEARS BLANK');
    }
    if (pageCheck.brokenImgs.length > 0) {
      result.notes.push(`${pageCheck.brokenImgs.length} broken image(s)`);
    }

    // ─── Button click testing (only for pages that loaded) ──
    if (result.status !== 'redirected-to-login' && result.status !== 'redirected') {
      try {
        const buttons = await page.$$('button:visible, .v-btn:visible');
        const maxBtns = Math.min(buttons.length, 15);
        for (let i = 0; i < maxBtns; i++) {
          try {
            const btn = buttons[i];
            const isVisible = await btn.isVisible().catch(() => false);
            if (!isVisible) continue;

            const btnInfo = await btn.evaluate(el => ({
              text: el.textContent?.trim()?.substring(0, 60) || '',
              disabled: el.disabled || el.classList.contains('v-btn--disabled'),
              type: el.getAttribute('type'),
              ariaLabel: el.getAttribute('aria-label') || '',
            }));

            if (btnInfo.disabled) continue;
            const lower = (btnInfo.text + ' ' + btnInfo.ariaLabel).toLowerCase();
            if (SKIP_BUTTONS.some(w => lower.includes(w))) continue;

            const errsBefore = result.consoleErrors.length + result.jsExceptions.length;
            await btn.click({ timeout: 2000, force: true }).catch(() => {});
            await page.waitForTimeout(500);
            const errsAfter = result.consoleErrors.length + result.jsExceptions.length;

            result.buttons.clicked++;
            summary.buttonsClicked++;

            if (errsAfter > errsBefore) {
              result.buttons.errors.push({
                text: btnInfo.text || btnInfo.ariaLabel || '(no text)',
                newErrors: errsAfter - errsBefore,
              });
              summary.buttonClickErrors++;
            }
          } catch (_e) {}
        }
      } catch (_e) {}

      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(200);
    }

    // Final status
    if (result.status === 'unknown') {
      if (result.jsExceptions.length > 0) result.status = 'js-exception';
      else if (result.consoleErrors.length > 0) result.status = 'has-errors';
      else result.status = 'ok';
    }
  } catch (err) {
    result.status = 'load-failed';
    result.loadTimeMs = Date.now() - startTime;
    result.notes.push(`Load error: ${err.message.substring(0, 200)}`);
    summary.loadFailed++;
  }

  page.off('console', consoleHandler);
  page.off('pageerror', errorHandler);
  page.off('requestfailed', networkHandler);
  try { await page.close(); } catch (_) {}

  return result;
}

async function main() {
  console.log('═'.repeat(120));
  console.log('COMPREHENSIVE AUTHENTICATED FRONT-END AUDIT — EmployeeGM GreenDog');
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Total routes to test: ${ALL_ROUTES.length}`);
  console.log('═'.repeat(120));

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
      '--disable-gpu', '--disable-extensions',
      '--js-flags=--max-old-space-size=512',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
  });

  // ─── AUTHENTICATE ────────────────────────────
  try {
    await authenticate(context);
  } catch (err) {
    console.error('❌ Authentication failed:', err.message);
    console.log('   Continuing without auth (pages will redirect to login)...');
  }

  // ─── Quick auth verification ──────────────────
  console.log('\n🔍 Verifying auth by loading dashboard...');
  const testPage = await context.newPage();
  await testPage.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 20000 });
  await testPage.waitForTimeout(3000);
  const testUrl = testPage.url();
  const isAuthed = !testUrl.includes('/auth/login');
  console.log(`   Dashboard URL: ${testUrl}`);
  console.log(`   Auth status: ${isAuthed ? '✅ AUTHENTICATED' : '❌ NOT AUTHENTICATED (pages will redirect to login)'}`);
  await testPage.close();

  const allResults = [];
  const summary = {
    totalPages: 0, ok: 0, loadFailed: 0, redirectedToLogin: 0,
    withConsoleErrors: 0, withJsExceptions: 0, withNetworkErrors: 0,
    totalConsoleErrors: 0, totalJsExceptions: 0, totalNetworkErrors: 0,
    buttonsFound: 0, buttonsClicked: 0, buttonClickErrors: 0, formsFound: 0,
    authenticated: isAuthed,
  };

  let currentSection = '';

  for (let i = 0; i < ALL_ROUTES.length; i++) {
    const route = ALL_ROUTES[i];

    if (route.section !== currentSection) {
      currentSection = route.section;
      console.log(`\n${'─'.repeat(100)}`);
      console.log(`SECTION: ${currentSection.toUpperCase()} (${i + 1}/${ALL_ROUTES.length})`);
      console.log('─'.repeat(100));
    }

    const result = await auditOnePage(context, route, summary);

    summary.totalPages++;
    if (result.status === 'ok') summary.ok++;
    if (result.consoleErrors.length > 0) summary.withConsoleErrors++;
    if (result.jsExceptions.length > 0) summary.withJsExceptions++;
    if (result.networkErrors.length > 0) summary.withNetworkErrors++;
    summary.totalConsoleErrors += result.consoleErrors.length;
    summary.totalJsExceptions += result.jsExceptions.length;
    summary.totalNetworkErrors += result.networkErrors.length;

    allResults.push(result);

    const icons = {
      'ok': '✅', 'has-errors': '⚠️ ', 'js-exception': '❌',
      'load-failed': '💥', 'redirected-to-login': '🔒', 'redirected': '↪️ ',
      'browser-error': '🔴',
    };
    const icon = icons[result.status] || '❓';
    const pad = route.path.padEnd(45);
    const bodyInfo = result.status !== 'redirected-to-login' ? ` Body:${result.bodyLength}c` : '';
    console.log(`${icon} ${pad} ${result.loadTimeMs.toString().padStart(5)}ms | Errs:${result.consoleErrors.length} JS:${result.jsExceptions.length} Net:${result.networkErrors.length} Btns:${result.buttons.total}/${result.buttons.clicked} Forms:${result.forms} Inputs:${result.inputs}${bodyInfo}`);

    if (result.jsExceptions.length > 0) {
      result.jsExceptions.forEach(e => console.log(`   💥 JS: ${e.substring(0, 200)}`));
    }
    if (result.consoleErrors.length > 0) {
      result.consoleErrors.slice(0, 5).forEach(e => console.log(`   ⚠️  ERR: ${e.substring(0, 200)}`));
      if (result.consoleErrors.length > 5) console.log(`   ... and ${result.consoleErrors.length - 5} more`);
    }
    if (result.networkErrors.length > 0) {
      result.networkErrors.slice(0, 3).forEach(e => console.log(`   🌐 NET: ${e.url} — ${e.failure}`));
    }
    if (result.buttons.errors.length > 0) {
      result.buttons.errors.forEach(e => console.log(`   🔘 BTN: "${e.text}" caused ${e.newErrors} error(s)`));
    }
    result.notes.filter(n => !n.startsWith('Title') && !n.startsWith('H1')).forEach(n => console.log(`   📝 ${n}`));

    await new Promise(r => setTimeout(r, INTER_PAGE_DELAY));

    if ((i + 1) % BATCH_SIZE === 0) {
      console.log(`   ⏳ Batch pause (${i + 1}/${ALL_ROUTES.length})...`);
      await new Promise(r => setTimeout(r, INTER_BATCH_DELAY));
    }
  }

  await context.close();
  await browser.close();

  // ═══════════════════════════════════════════════
  // FINAL REPORT
  // ═══════════════════════════════════════════════
  console.log('\n' + '═'.repeat(120));
  console.log('                           FRONT-END AUDIT SUMMARY');
  console.log('═'.repeat(120));
  console.log(`Authenticated:                ${summary.authenticated ? 'YES (admin)' : 'NO (unauthenticated)'}`);
  console.log(`Total Pages Tested:           ${summary.totalPages}`);
  console.log(`  ✅ Loaded OK (no errors):    ${summary.ok}`);
  console.log(`  🔒 Redirected to Login:      ${summary.redirectedToLogin}`);
  console.log(`  💥 Failed to Load:           ${summary.loadFailed}`);
  console.log(`  ⚠️  With Console Errors:      ${summary.withConsoleErrors}`);
  console.log(`  ❌ With JS Exceptions:       ${summary.withJsExceptions}`);
  console.log(`  🌐 With Network Errors:      ${summary.withNetworkErrors}`);
  console.log('');
  console.log(`Total Console Errors:         ${summary.totalConsoleErrors}`);
  console.log(`Total JS Exceptions:          ${summary.totalJsExceptions}`);
  console.log(`Total Network Errors:         ${summary.totalNetworkErrors}`);
  console.log(`Buttons Found / Clicked:      ${summary.buttonsFound} / ${summary.buttonsClicked}`);
  console.log(`Button Click Errors:          ${summary.buttonClickErrors}`);
  console.log(`Forms Found:                  ${summary.formsFound}`);

  const problemPages = allResults.filter(r =>
    r.jsExceptions.length > 0 ||
    r.status === 'load-failed' ||
    r.status === 'browser-error' ||
    (r.consoleErrors.length > 0 && r.status !== 'redirected-to-login')
  );

  if (problemPages.length > 0) {
    console.log('\n' + '─'.repeat(120));
    console.log('PROBLEM PAGES REQUIRING ATTENTION:');
    console.log('─'.repeat(120));
    for (const p of problemPages) {
      console.log(`\n  ❌ ${p.path} [${p.section}] — Status: ${p.status}, Load: ${p.loadTimeMs}ms`);
      if (p.jsExceptions.length) {
        console.log(`     JS Exceptions (${p.jsExceptions.length}):`);
        p.jsExceptions.forEach(e => console.log(`       • ${e}`));
      }
      if (p.consoleErrors.length) {
        console.log(`     Console Errors (${p.consoleErrors.length}):`);
        p.consoleErrors.forEach(e => console.log(`       • ${e}`));
      }
      if (p.networkErrors.length) {
        console.log(`     Network Errors (${p.networkErrors.length}):`);
        p.networkErrors.forEach(e => console.log(`       • ${e.url} — ${e.failure}`));
      }
      if (p.buttons.errors.length) {
        console.log(`     Button Errors:`);
        p.buttons.errors.forEach(e => console.log(`       • "${e.text}" → ${e.newErrors} error(s)`));
      }
      p.notes.forEach(n => console.log(`     📝 ${n}`));
    }
  } else {
    console.log('\n✅ NO CRITICAL PROBLEM PAGES DETECTED');
  }

  // OK pages
  const okPages = allResults.filter(r => r.status === 'ok');
  if (okPages.length > 0) {
    console.log('\n' + '─'.repeat(120));
    console.log(`PAGES THAT LOADED CLEANLY (${okPages.length}):`);
    console.log('─'.repeat(120));
    for (const p of okPages) {
      console.log(`  ✅ ${p.path} [${p.section}] — ${p.loadTimeMs}ms, ${p.buttons.total} btns, ${p.forms} forms, ${p.inputs} inputs, body:${p.bodyLength}c`);
    }
  }

  const report = {
    meta: { version: 'v3-auth', timestamp: new Date().toISOString(), baseUrl: BASE, totalRoutes: ALL_ROUTES.length, authenticated: summary.authenticated },
    summary,
    results: allResults,
  };
  writeFileSync('/workspaces/EmployeeGM-GreenDog/audit-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Full JSON report: audit-report.json');
  console.log('═'.repeat(120));
}

main().catch(err => {
  console.error('AUDIT SCRIPT CRASHED:', err);
  process.exit(1);
});
