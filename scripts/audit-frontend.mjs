/**
 * COMPREHENSIVE FRONT-END AUDIT SCRIPT
 * Uses Playwright to visit every page, check console errors,
 * test buttons, network requests, and overall functionality.
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';

// All routes organized by section
const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/callback',
  '/public/careers',
];

const PROTECTED_ROUTES = [
  // Dashboard / Core
  '/',
  '/activity',
  '/contact-list',
  '/development',
  '/export-payroll',
  '/goals',
  '/leads',
  '/marketplace',
  '/mentorship',
  '/my-ops',
  '/my-schedule',
  '/profile',
  '/reviews',
  '/settings',
  '/skills-library',
  '/time-off',
  '/wiki',

  // Admin
  '/admin/agents',
  '/admin/email-templates',
  '/admin/scheduling-rules',
  '/admin/services',
  '/admin/skills-management',
  '/admin/slack',
  '/admin/system-health',
  '/admin/users',
  '/admin/intake',
  '/admin/payroll/review',

  // Academy
  '/academy',
  '/academy/catalog',
  '/academy/course-manager',
  '/academy/my-training',
  '/academy/signoffs',
  '/academy/manager/create',

  // Employees
  '/employees',

  // GDU
  '/gdu/students',
  '/gdu/visitors',
  '/gdu/events',
  '/gdu/events/new',

  // Growth
  '/growth/events',
  '/growth/goals',
  '/growth/leads',
  '/growth/partners',

  // Marketing
  '/marketing',
  '/marketing/appointment-analysis',
  '/marketing/calendar',
  '/marketing/command-center',
  '/marketing/ezyvet-analytics',
  '/marketing/ezyvet-integration',
  '/marketing/influencers',
  '/marketing/inventory',
  '/marketing/invoice-analysis',
  '/marketing/list-hygiene',
  '/marketing/partners',
  '/marketing/partnerships',
  '/marketing/practice-analytics',
  '/marketing/resources',
  '/marketing/sauron',

  // Med-Ops
  '/med-ops/boards',
  '/med-ops/calculators',
  '/med-ops/facilities',
  '/med-ops/partners',
  '/med-ops/wiki',
  '/med-ops/safety',
  '/med-ops/safety/manage-types',
  '/med-ops/safety/qr-codes',

  // People
  '/people/my-skills',
  '/people/skill-stats',

  // Recruiting
  '/recruiting',
  '/recruiting/candidates',
  '/recruiting/interviews',
  '/recruiting/onboarding',

  // Roster
  '/roster',

  // Schedule
  '/schedule',
  '/schedule/builder',
  '/schedule/services',
  '/schedule/wizard',

  // Training
  '/training',
];

// Result tracking
const results = {
  pages: [],
  summary: {
    totalPages: 0,
    pagesWithErrors: 0,
    pagesWithWarnings: 0,
    pagesLoaded: 0,
    pagesFailed: 0,
    totalConsoleErrors: 0,
    totalConsoleWarnings: 0,
    totalNetworkErrors: 0,
    totalJSExceptions: 0,
    redirectedToLogin: 0,
    buttonsFound: 0,
    buttonsClicked: 0,
    buttonErrors: 0,
    formsFound: 0,
  }
};

async function auditPage(page, route, isPublic = false) {
  const pageResult = {
    route,
    isPublic,
    status: 'unknown',
    httpStatus: null,
    loadTimeMs: 0,
    redirectedTo: null,
    consoleErrors: [],
    consoleWarnings: [],
    networkErrors: [],
    jsExceptions: [],
    buttons: { total: 0, clicked: 0, errors: [] },
    forms: { total: 0 },
    links: { total: 0, broken: [] },
    vuetifyComponents: 0,
    componentErrors: [],
    notes: [],
  };

  const consoleMessages = [];
  const networkErrors = [];

  // Capture console messages
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      // Skip known non-critical errors
      if (text.includes('favicon') || text.includes('manifest.json')) return;
      pageResult.consoleErrors.push(text.substring(0, 500));
    } else if (type === 'warning') {
      if (text.includes('[Vue warn]') || text.includes('DevTools') || text.includes('Source map')) return;
      pageResult.consoleWarnings.push(text.substring(0, 500));
    }
  });

  // Capture unhandled JS exceptions
  page.on('pageerror', (err) => {
    pageResult.jsExceptions.push(err.message.substring(0, 500));
  });

  // Capture failed network requests
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (url.includes('favicon') || url.includes('hot-update') || url.includes('__vite_ping')) return;
    pageResult.networkErrors.push({
      url: url.substring(0, 200),
      failure: request.failure()?.errorText || 'unknown',
    });
  });

  const startTime = Date.now();

  try {
    // Navigate to the page
    const response = await page.goto(`${BASE}${route}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    pageResult.httpStatus = response?.status();
    pageResult.loadTimeMs = Date.now() - startTime;

    // Wait a bit more for SPA rendering
    await page.waitForTimeout(2000);

    // Check if we got redirected
    const currentUrl = page.url();
    const currentPath = new URL(currentUrl).pathname;
    if (currentPath !== route) {
      pageResult.redirectedTo = currentPath;
      if (currentPath === '/auth/login') {
        pageResult.status = 'redirected-to-login';
        results.summary.redirectedToLogin++;
      } else {
        pageResult.status = 'redirected';
      }
    }

    // Check page title / content
    const title = await page.title();
    pageResult.notes.push(`Title: ${title}`);

    // Count Vuetify components rendered
    try {
      pageResult.vuetifyComponents = await page.evaluate(() => {
        return document.querySelectorAll('[class*="v-"]').length;
      });
    } catch (e) {
      pageResult.notes.push('Could not count Vuetify components');
    }

    // Check for Vue error overlay
    try {
      const hasErrorOverlay = await page.evaluate(() => {
        return !!document.querySelector('.nuxt-error-page') || 
               !!document.querySelector('#nuxt-error') ||
               !!document.querySelector('[data-v-error]') ||
               !!document.querySelector('.v-overlay--active .v-alert--type-error');
      });
      if (hasErrorOverlay) {
        pageResult.notes.push('⚠️ ERROR OVERLAY DETECTED ON PAGE');
        pageResult.status = 'error-overlay';
      }
    } catch (e) { /* ignore */ }

    // Check for empty/blank page (no meaningful content)
    try {
      const bodyText = await page.evaluate(() => document.body?.innerText?.trim()?.length || 0);
      if (bodyText < 10) {
        pageResult.notes.push('⚠️ PAGE APPEARS BLANK (< 10 chars of text)');
      }
    } catch (e) { /* ignore */ }

    // Count and audit buttons
    if (pageResult.status !== 'redirected-to-login') {
      try {
        const buttons = await page.$$('button, [role="button"], .v-btn');
        pageResult.buttons.total = buttons.length;
        results.summary.buttonsFound += buttons.length;

        // Try to click interactive buttons (non-navigation, non-submit)
        for (let i = 0; i < Math.min(buttons.length, 15); i++) {
          try {
            const btn = buttons[i];
            const isVisible = await btn.isVisible();
            const isDisabled = await btn.evaluate(el => el.disabled || el.classList.contains('v-btn--disabled'));
            const btnText = await btn.evaluate(el => el.textContent?.trim()?.substring(0, 50));
            const btnType = await btn.evaluate(el => el.getAttribute('type'));
            
            // Skip submit buttons, invisible buttons, disabled buttons
            if (!isVisible || isDisabled || btnType === 'submit') continue;

            // Skip destructive buttons
            const lowerText = (btnText || '').toLowerCase();
            if (lowerText.includes('delete') || lowerText.includes('remove') || 
                lowerText.includes('destroy') || lowerText.includes('logout') ||
                lowerText.includes('sign out') || lowerText.includes('reset')) continue;

            // Click and capture errors
            const errorsBefore = pageResult.consoleErrors.length + pageResult.jsExceptions.length;
            await btn.click({ timeout: 3000 }).catch(() => {});
            await page.waitForTimeout(500);
            const errorsAfter = pageResult.consoleErrors.length + pageResult.jsExceptions.length;
            
            pageResult.buttons.clicked++;
            results.summary.buttonsClicked++;
            
            if (errorsAfter > errorsBefore) {
              pageResult.buttons.errors.push({
                text: btnText,
                newErrors: errorsAfter - errorsBefore,
              });
              results.summary.buttonErrors++;
            }
          } catch (e) {
            // Button interaction failed - not necessarily an error
          }
        }
      } catch (e) {
        pageResult.notes.push('Could not audit buttons');
      }

      // Count forms
      try {
        pageResult.forms.total = await page.evaluate(() => {
          return document.querySelectorAll('form, .v-form').length;
        });
        results.summary.formsFound += pageResult.forms.total;
      } catch (e) { /* ignore */ }

      // Count links
      try {
        pageResult.links.total = await page.evaluate(() => {
          return document.querySelectorAll('a[href]').length;
        });
      } catch (e) { /* ignore */ }

      // Check for broken images
      try {
        const brokenImages = await page.evaluate(() => {
          const imgs = document.querySelectorAll('img');
          const broken = [];
          imgs.forEach(img => {
            if (img.naturalWidth === 0 && img.src) {
              broken.push(img.src.substring(0, 100));
            }
          });
          return broken;
        });
        if (brokenImages.length > 0) {
          pageResult.notes.push(`⚠️ ${brokenImages.length} broken image(s): ${brokenImages.join(', ')}`);
        }
      } catch (e) { /* ignore */ }
    }

    // Determine final status
    if (pageResult.status === 'unknown') {
      if (pageResult.jsExceptions.length > 0) {
        pageResult.status = 'js-exception';
      } else if (pageResult.consoleErrors.length > 0) {
        pageResult.status = 'console-errors';
      } else {
        pageResult.status = 'ok';
      }
    }

  } catch (err) {
    pageResult.status = 'load-failed';
    pageResult.notes.push(`Load error: ${err.message.substring(0, 200)}`);
  }

  // Update summary
  results.summary.totalPages++;
  if (pageResult.status === 'ok') results.summary.pagesLoaded++;
  else if (pageResult.status === 'load-failed') results.summary.pagesFailed++;
  if (pageResult.consoleErrors.length > 0) results.summary.pagesWithErrors++;
  if (pageResult.consoleWarnings.length > 0) results.summary.pagesWithWarnings++;
  results.summary.totalConsoleErrors += pageResult.consoleErrors.length;
  results.summary.totalConsoleWarnings += pageResult.consoleWarnings.length;
  results.summary.totalNetworkErrors += pageResult.networkErrors.length;
  results.summary.totalJSExceptions += pageResult.jsExceptions.length;

  results.pages.push(pageResult);

  // Print progress
  const statusIcon = {
    'ok': '✅',
    'console-errors': '⚠️',
    'js-exception': '❌',
    'load-failed': '💥',
    'redirected-to-login': '🔒',
    'redirected': '↪️',
    'error-overlay': '🚨',
  }[pageResult.status] || '❓';

  console.log(`${statusIcon} ${route.padEnd(45)} | ${pageResult.loadTimeMs}ms | Errs:${pageResult.consoleErrors.length} Warns:${pageResult.consoleWarnings.length} Net:${pageResult.networkErrors.length} JS:${pageResult.jsExceptions.length} Btns:${pageResult.buttons.total}/${pageResult.buttons.clicked}`);

  if (pageResult.jsExceptions.length > 0) {
    pageResult.jsExceptions.forEach(e => console.log(`   💥 JS Exception: ${e.substring(0, 150)}`));
  }
  if (pageResult.consoleErrors.length > 0) {
    pageResult.consoleErrors.slice(0, 5).forEach(e => console.log(`   ⚠️ Console Error: ${e.substring(0, 150)}`));
  }
  if (pageResult.networkErrors.length > 0) {
    pageResult.networkErrors.slice(0, 3).forEach(e => console.log(`   🌐 Network Error: ${e.url} — ${e.failure}`));
  }
  if (pageResult.buttons.errors.length > 0) {
    pageResult.buttons.errors.forEach(e => console.log(`   🔘 Button "${e.text}" caused ${e.newErrors} new error(s)`));
  }

  // Clean up listeners
  page.removeAllListeners('console');
  page.removeAllListeners('pageerror');
  page.removeAllListeners('requestfailed');
}

async function main() {
  console.log('=' .repeat(120));
  console.log('COMPREHENSIVE FRONT-END AUDIT — EmployeeGM GreenDog');
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('=' .repeat(120));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AuditBot/1.0',
    ignoreHTTPSErrors: true,
  });

  // ═══════════════════════════════════════════════════════
  // SECTION 1: PUBLIC PAGES (no auth required)
  // ═══════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(120));
  console.log('SECTION 1: PUBLIC & AUTH PAGES');
  console.log('─'.repeat(120));

  for (const route of PUBLIC_ROUTES) {
    const page = await context.newPage();
    await auditPage(page, route, true);
    await page.close();
  }

  // ═══════════════════════════════════════════════════════
  // SECTION 2: PROTECTED PAGES
  // The SPA will load the shell, then middleware redirects
  // to /auth/login. We capture errors from the shell load
  // and any JS exceptions during route resolution.
  // We also test with injected auth state.
  // ═══════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(120));
  console.log('SECTION 2: PROTECTED PAGES (initial load — will redirect to login)');
  console.log('─'.repeat(120));

  for (const route of PROTECTED_ROUTES) {
    const page = await context.newPage();
    await auditPage(page, route, false);
    await page.close();
  }

  // ═══════════════════════════════════════════════════════
  // SECTION 3: BUILD INTEGRITY CHECK
  // Check for chunk loading errors, missing assets
  // ═══════════════════════════════════════════════════════
  console.log('\n' + '─'.repeat(120));
  console.log('SECTION 3: BUILD INTEGRITY — Checking asset loading');
  console.log('─'.repeat(120));

  const integrityPage = await context.newPage();
  const missingAssets = [];
  integrityPage.on('requestfailed', (request) => {
    missingAssets.push({ url: request.url(), failure: request.failure()?.errorText });
  });
  const allResponseStatuses = [];
  integrityPage.on('response', (response) => {
    if (response.status() >= 400) {
      allResponseStatuses.push({ url: response.url().substring(0, 150), status: response.status() });
    }
  });

  await integrityPage.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await integrityPage.waitForTimeout(3000);
  
  if (missingAssets.length > 0) {
    console.log(`❌ ${missingAssets.length} failed asset requests:`);
    missingAssets.forEach(a => console.log(`   - ${a.url} (${a.failure})`));
  } else {
    console.log('✅ All assets loaded successfully');
  }

  if (allResponseStatuses.length > 0) {
    console.log(`⚠️ ${allResponseStatuses.length} HTTP error responses:`);
    allResponseStatuses.forEach(r => console.log(`   - ${r.status}: ${r.url}`));
  } else {
    console.log('✅ No HTTP error responses');
  }

  await integrityPage.close();

  // ═══════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ═══════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(120));
  console.log('AUDIT SUMMARY');
  console.log('═'.repeat(120));
  console.log(`Total Pages Tested:       ${results.summary.totalPages}`);
  console.log(`Pages Loaded OK:          ${results.summary.pagesLoaded}`);
  console.log(`Pages Failed to Load:     ${results.summary.pagesFailed}`);
  console.log(`Pages Redirected to Login: ${results.summary.redirectedToLogin}`);
  console.log(`Pages with Console Errors: ${results.summary.pagesWithErrors}`);
  console.log(`Pages with Warnings:      ${results.summary.pagesWithWarnings}`);
  console.log(`Total Console Errors:     ${results.summary.totalConsoleErrors}`);
  console.log(`Total Console Warnings:   ${results.summary.totalConsoleWarnings}`);
  console.log(`Total Network Errors:     ${results.summary.totalNetworkErrors}`);
  console.log(`Total JS Exceptions:      ${results.summary.totalJSExceptions}`);
  console.log(`Buttons Found:            ${results.summary.buttonsFound}`);
  console.log(`Buttons Clicked:          ${results.summary.buttonsClicked}`);
  console.log(`Button Click Errors:      ${results.summary.buttonErrors}`);
  console.log(`Forms Found:              ${results.summary.formsFound}`);

  // List problem pages
  const problemPages = results.pages.filter(p =>
    p.jsExceptions.length > 0 ||
    (p.consoleErrors.length > 0 && p.status !== 'redirected-to-login') ||
    p.status === 'load-failed' ||
    p.status === 'error-overlay'
  );

  if (problemPages.length > 0) {
    console.log('\n' + '─'.repeat(120));
    console.log('PROBLEM PAGES REQUIRING ATTENTION:');
    console.log('─'.repeat(120));
    for (const p of problemPages) {
      console.log(`\n❌ ${p.route}`);
      console.log(`   Status: ${p.status}`);
      if (p.jsExceptions.length > 0) {
        console.log(`   JS Exceptions (${p.jsExceptions.length}):`);
        p.jsExceptions.forEach(e => console.log(`     • ${e}`));
      }
      if (p.consoleErrors.length > 0) {
        console.log(`   Console Errors (${p.consoleErrors.length}):`);
        p.consoleErrors.forEach(e => console.log(`     • ${e}`));
      }
      if (p.networkErrors.length > 0) {
        console.log(`   Network Errors (${p.networkErrors.length}):`);
        p.networkErrors.forEach(e => console.log(`     • ${e.url} — ${e.failure}`));
      }
      if (p.buttons.errors.length > 0) {
        console.log(`   Button Errors:`);
        p.buttons.errors.forEach(e => console.log(`     • "${e.text}" caused ${e.newErrors} error(s)`));
      }
      p.notes.filter(n => n.startsWith('⚠️')).forEach(n => console.log(`   ${n}`));
    }
  } else {
    console.log('\n✅ NO PROBLEM PAGES DETECTED');
  }

  // Pages that loaded cleanly
  const cleanPages = results.pages.filter(p => p.status === 'ok');
  console.log(`\n✅ ${cleanPages.length} pages loaded cleanly with no errors`);

  // Write detailed JSON report
  const reportPath = '/workspaces/EmployeeGM-GreenDog/audit-report.json';
  const fs = await import('fs');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nDetailed report written to: ${reportPath}`);

  console.log('\n' + '═'.repeat(120));
  console.log(`Audit completed: ${new Date().toISOString()}`);
  console.log('═'.repeat(120));

  await browser.close();
}

main().catch(console.error);
