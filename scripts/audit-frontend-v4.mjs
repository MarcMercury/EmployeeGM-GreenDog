/**
 * COMPREHENSIVE AUTHENTICATED FRONT-END AUDIT v4
 * - Gets real session via Supabase magic link + verify
 * - Injects auth as cookies into browser context
 * - Fresh page per route, batch processing with pauses
 * - Tests buttons, forms, console errors, JS exceptions, network failures
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const BASE = 'http://localhost:3000';
const BATCH_SIZE = 5;
const INTER_PAGE_DELAY = 1200;
const INTER_BATCH_DELAY = 3000;
const PAGE_TIMEOUT = 35000;
const SPA_SETTLE = 3500;

const SUPABASE_URL = 'https://uekumyupkhnpjpdcjfxb.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVla3VteXVwa2hucGpwZGNqZnhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA5NTYzMiwiZXhwIjoyMDgwNjcxNjMyfQ.zAUg6sayz3TYhw9eeo3hrFA5sytlSYybQAypKKOaoL4';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVla3VteXVwa2hucGpwZGNqZnhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwOTU2MzIsImV4cCI6MjA4MDY3MTYzMn0.5iik5FKdA2rgFfK-IeRL7FAiE_wymiaSavD4b9EheTw';
const ADMIN_EMAIL = 'rendvm@gmail.com';
const PROJECT_REF = 'uekumyupkhnpjpdcjfxb';

const ALL_ROUTES = [
  { path: '/auth/login', section: 'Auth', public: true },
  { path: '/public/careers', section: 'Public', public: true },
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
  { path: '/academy', section: 'Academy' },
  { path: '/academy/catalog', section: 'Academy' },
  { path: '/academy/course-manager', section: 'Academy' },
  { path: '/academy/manager/create', section: 'Academy' },
  { path: '/academy/my-training', section: 'Academy' },
  { path: '/academy/signoffs', section: 'Academy' },
  { path: '/employees', section: 'Employees' },
  { path: '/gdu/events', section: 'GDU' },
  { path: '/gdu/events/new', section: 'GDU' },
  { path: '/gdu/students', section: 'GDU' },
  { path: '/gdu/visitors', section: 'GDU' },
  { path: '/growth/events', section: 'Growth' },
  { path: '/growth/goals', section: 'Growth' },
  { path: '/growth/leads', section: 'Growth' },
  { path: '/growth/partners', section: 'Growth' },
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
  { path: '/med-ops/boards', section: 'Med-Ops' },
  { path: '/med-ops/calculators', section: 'Med-Ops' },
  { path: '/med-ops/facilities', section: 'Med-Ops' },
  { path: '/med-ops/partners', section: 'Med-Ops' },
  { path: '/med-ops/safety', section: 'Med-Ops' },
  { path: '/med-ops/safety/manage-types', section: 'Med-Ops' },
  { path: '/med-ops/safety/qr-codes', section: 'Med-Ops' },
  { path: '/med-ops/wiki', section: 'Med-Ops' },
  { path: '/people/my-skills', section: 'People' },
  { path: '/people/skill-stats', section: 'People' },
  { path: '/recruiting', section: 'Recruiting' },
  { path: '/recruiting/candidates', section: 'Recruiting' },
  { path: '/recruiting/interviews', section: 'Recruiting' },
  { path: '/recruiting/onboarding', section: 'Recruiting' },
  { path: '/roster', section: 'Roster' },
  { path: '/schedule', section: 'Schedule' },
  { path: '/schedule/builder', section: 'Schedule' },
  { path: '/schedule/services', section: 'Schedule' },
  { path: '/schedule/wizard', section: 'Schedule' },
  { path: '/training', section: 'Training' },
];

const SKIP_BUTTONS = [
  'delete', 'remove', 'destroy', 'logout', 'sign out', 'log out', 'reset',
  'submit', 'save', 'confirm', 'approve', 'reject', 'send', 'publish',
  'archive', 'deactivate', 'terminate', 'cancel subscription',
  'mdi-logout', 'mdi-delete', 'mdi-close', 'mdi-trash',
];

async function getSessionTokens() {
  console.log('🔐 Getting session tokens...');
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await sb.auth.admin.generateLink({
    type: 'magiclink',
    email: ADMIN_EMAIL,
  });
  if (error) throw new Error(`Magic link failed: ${error.message}`);

  const tokenHash = data.properties.hashed_token;

  const resp = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ type: 'magiclink', token_hash: tokenHash }),
  });

  if (!resp.ok) throw new Error(`Verify failed: ${resp.status}`);
  const session = await resp.json();
  console.log(`   ✅ Got session for ${session.user?.email} (expires in ${session.expires_in}s)`);
  return session;
}

async function auditOnePage(context, route, summary, authCookies) {
  // Re-inject auth cookies before each page (in case they were cleared)
  if (authCookies && authCookies.length > 0) {
    await context.addCookies(authCookies);
  }

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
    h1: '',
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
          text.includes('net::ERR_ABORTED') || text.includes('DevTools') ||
          text.includes('.map') || text.includes('source map')) return;
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
        url.includes('manifest.json') || url.includes('.map') ||
        url.includes('devtools') || url.includes('builds/meta/dev.json')) return;
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
      return { hasError, bodyLen, title, vuetifyCount, btnCount, formCount, inputCount, tableCount, brokenImgs, h1 };
    });

    result.vuetifyComponents = pageCheck.vuetifyCount;
    result.buttons.total = pageCheck.btnCount;
    result.forms = pageCheck.formCount;
    result.inputs = pageCheck.inputCount;
    result.tables = pageCheck.tableCount;
    result.brokenImages = pageCheck.brokenImgs;
    result.pageTitle = pageCheck.title;
    result.bodyLength = pageCheck.bodyLen;
    result.h1 = pageCheck.h1;
    summary.buttonsFound += pageCheck.btnCount;
    summary.formsFound += pageCheck.formCount;

    if (pageCheck.hasError) result.notes.push('ERROR OVERLAY DETECTED');
    if (pageCheck.bodyLen < 10 && result.status !== 'redirected-to-login') {
      result.notes.push('PAGE APPEARS BLANK');
    }
    if (pageCheck.brokenImgs.length > 0) {
      result.notes.push(`${pageCheck.brokenImgs.length} broken image(s)`);
    }

    // Button click testing
    if (result.status !== 'redirected-to-login' && result.status !== 'redirected') {
      try {
        const buttons = await page.$$('button:visible, .v-btn:visible');
        const maxBtns = Math.min(buttons.length, 20);
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
              innerHTML: el.innerHTML?.substring(0, 200) || '',
              isInNav: !!el.closest('nav, .v-navigation-drawer, .v-app-bar, header, .app-header, .app-sidebar'),
            }));

            if (btnInfo.disabled) continue;
            // Skip nav/header/sidebar buttons to avoid navigation away
            if (btnInfo.isInNav) continue;
            const lower = (btnInfo.text + ' ' + btnInfo.ariaLabel + ' ' + btnInfo.innerHTML).toLowerCase();
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
  console.log('COMPREHENSIVE AUTHENTICATED FRONT-END AUDIT v4 — EmployeeGM GreenDog');
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Total routes: ${ALL_ROUTES.length}`);
  console.log('═'.repeat(120));

  // Step 1: Get real session tokens
  const session = await getSessionTokens();

  // Step 2: Launch browser with auth cookies
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
      '--disable-gpu', '--disable-extensions',
    ],
  });

  // The @nuxtjs/supabase module reads from cookies
  // Cookie name: sb-<ref>-auth-token  (stores JSON-encoded session)
  // It also splits into chunk cookies for large values:
  //   sb-<ref>-auth-token.0, sb-<ref>-auth-token.1, etc.
  const cookieValue = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    token_type: session.token_type || 'bearer',
    expires_in: session.expires_in,
    expires_at: session.expires_at || Math.floor(Date.now() / 1000) + session.expires_in,
    user: session.user,
  });

  // The module uses base64url encoding for cookies and splits into ~3500 byte chunks
  const encoded = Buffer.from(cookieValue).toString('base64url');
  const CHUNK_SIZE = 3500;
  const chunks = [];
  for (let i = 0; i < encoded.length; i += CHUNK_SIZE) {
    chunks.push(encoded.substring(i, i + CHUNK_SIZE));
  }

  const cookies = [];
  if (chunks.length === 1) {
    cookies.push({
      name: `sb-${PROJECT_REF}-auth-token`,
      value: encoded,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    });
  } else {
    for (let i = 0; i < chunks.length; i++) {
      cookies.push({
        name: `sb-${PROJECT_REF}-auth-token.${i}`,
        value: chunks[i],
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      });
    }
  }

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
  });

  await context.addCookies(cookies);
  console.log(`   Set ${cookies.length} auth cookie(s) (${encoded.length} bytes total)`);

  // Step 3: Verify auth works
  console.log('\n🔍 Verifying authentication...');
  const testPage = await context.newPage();
  await testPage.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 30000 });
  await testPage.waitForTimeout(4000);
  const testUrl = testPage.url();
  const isAuthed = !testUrl.includes('/auth/login');
  console.log(`   Dashboard URL: ${testUrl}`);
  console.log(`   Auth status: ${isAuthed ? '✅ AUTHENTICATED' : '❌ NOT AUTHENTICATED'}`);

  if (!isAuthed) {
    // Try alternate cookie format (non-encoded, direct JSON value)
    console.log('   Trying alternate cookie format...');
    await context.clearCookies();
    
    // Try plain JSON in cookie
    const plainCookies = [{
      name: `sb-${PROJECT_REF}-auth-token`,
      value: cookieValue,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    }];
    await context.addCookies(plainCookies);
    
    await testPage.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 30000 });
    await testPage.waitForTimeout(4000);
    const testUrl2 = testPage.url();
    const isAuthed2 = !testUrl2.includes('/auth/login');
    console.log(`   Dashboard URL (attempt 2): ${testUrl2}`);
    console.log(`   Auth status: ${isAuthed2 ? '✅ AUTHENTICATED' : '❌ NOT AUTHENTICATED'}`);

    if (!isAuthed2) {
      // Try setting via page context (localStorage + cookie)
      console.log('   Trying localStorage injection...');
      await testPage.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle', timeout: 15000 });
      await testPage.waitForTimeout(2000);
      
      await testPage.evaluate((sessionStr) => {
        const session = JSON.parse(sessionStr);
        // Try multiple storage keys
        const ref = 'uekumyupkhnpjpdcjfxb';
        localStorage.setItem(`sb-${ref}-auth-token`, sessionStr);
        
        // Also set in the format Supabase JS client uses
        const storageKey = `sb-${ref}-auth-token`;
        const sessionObj = {
          currentSession: {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            token_type: 'bearer',
            expires_in: session.expires_in,
            expires_at: session.expires_at,
            user: session.user,
          },
          expiresAt: session.expires_at,
        };
        localStorage.setItem(storageKey, JSON.stringify(sessionObj));
      }, cookieValue);

      await testPage.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 30000 });
      await testPage.waitForTimeout(4000);
      const testUrl3 = testPage.url();
      const isAuthed3 = !testUrl3.includes('/auth/login');
      console.log(`   Dashboard URL (attempt 3): ${testUrl3}`);
      console.log(`   Auth status: ${isAuthed3 ? '✅ AUTHENTICATED' : '❌ NOT AUTHENTICATED'}`);
    }
  }

  await testPage.close();

  // Re-check auth status for summary
  const verifyPage = await context.newPage();
  await verifyPage.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 20000 });
  await verifyPage.waitForTimeout(3000);
  const verified = !verifyPage.url().includes('/auth/login');
  await verifyPage.close();

  const allResults = [];
  const summary = {
    totalPages: 0, ok: 0, loadFailed: 0, redirectedToLogin: 0,
    withConsoleErrors: 0, withJsExceptions: 0, withNetworkErrors: 0,
    totalConsoleErrors: 0, totalJsExceptions: 0, totalNetworkErrors: 0,
    buttonsFound: 0, buttonsClicked: 0, buttonClickErrors: 0, formsFound: 0,
    authenticated: verified,
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

    const result = await auditOnePage(context, route, summary, cookies);

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
    const extra = result.status !== 'redirected-to-login'
      ? ` Body:${result.bodyLength}c H1:"${result.h1?.substring(0,30) || ''}"`
      : '';
    console.log(`${icon} ${pad} ${result.loadTimeMs.toString().padStart(5)}ms | Errs:${result.consoleErrors.length} JS:${result.jsExceptions.length} Net:${result.networkErrors.length} Btns:${result.buttons.total}/${result.buttons.clicked} Forms:${result.forms} In:${result.inputs}${extra}`);

    if (result.jsExceptions.length > 0)
      result.jsExceptions.forEach(e => console.log(`   💥 JS: ${e.substring(0, 250)}`));
    if (result.consoleErrors.length > 0) {
      result.consoleErrors.slice(0, 5).forEach(e => console.log(`   ⚠️  ERR: ${e.substring(0, 250)}`));
      if (result.consoleErrors.length > 5) console.log(`   ... and ${result.consoleErrors.length - 5} more`);
    }
    if (result.networkErrors.length > 0)
      result.networkErrors.slice(0, 3).forEach(e => console.log(`   🌐 NET: ${e.url} — ${e.failure}`));
    if (result.buttons.errors.length > 0)
      result.buttons.errors.forEach(e => console.log(`   🔘 BTN: "${e.text}" caused ${e.newErrors} error(s)`));
    result.notes.forEach(n => console.log(`   📝 ${n}`));

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
    r.jsExceptions.length > 0 || r.status === 'load-failed' || r.status === 'browser-error' ||
    (r.consoleErrors.length > 0 && r.status !== 'redirected-to-login')
  );

  if (problemPages.length > 0) {
    console.log('\n' + '─'.repeat(120));
    console.log(`PROBLEM PAGES REQUIRING ATTENTION (${problemPages.length}):`);
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

  const okPages = allResults.filter(r => r.status === 'ok');
  if (okPages.length > 0) {
    console.log('\n' + '─'.repeat(120));
    console.log(`PAGES LOADED CLEANLY (${okPages.length}):`);
    console.log('─'.repeat(120));
    for (const p of okPages) {
      console.log(`  ✅ ${p.path.padEnd(45)} ${p.loadTimeMs}ms | ${p.buttons.total} btns (${p.buttons.clicked} clicked) | ${p.forms} forms | ${p.inputs} inputs | ${p.tables} tables | body:${p.bodyLength}c | H1:"${p.h1?.substring(0,40) || ''}"`);
    }
  }

  const report = {
    meta: { version: 'v4-auth', timestamp: new Date().toISOString(), baseUrl: BASE, totalRoutes: ALL_ROUTES.length, authenticated: summary.authenticated },
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
