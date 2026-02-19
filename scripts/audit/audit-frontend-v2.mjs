/**
 * COMPREHENSIVE FRONT-END AUDIT SCRIPT v2
 * Uses a single Playwright page to visit every route sequentially,
 * capturing console errors, network failures, button interactions.
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'http://localhost:3000';

const ALL_ROUTES = [
  // Public/Auth pages (no login required)
  { path: '/auth/login', section: 'Auth', public: true },
  { path: '/auth/callback', section: 'Auth', public: true },
  { path: '/public/careers', section: 'Public', public: true },

  // Dashboard / Core
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

  // Admin
  { path: '/admin/agents', section: 'Admin' },
  { path: '/admin/email-templates', section: 'Admin' },
  { path: '/admin/scheduling-rules', section: 'Admin' },
  { path: '/admin/services', section: 'Admin' },
  { path: '/admin/skills-management', section: 'Admin' },
  { path: '/admin/slack', section: 'Admin' },
  { path: '/admin/system-health', section: 'Admin' },
  { path: '/admin/users', section: 'Admin' },
  { path: '/admin/intake', section: 'Admin' },
  { path: '/admin/payroll/review', section: 'Admin' },

  // Academy
  { path: '/academy', section: 'Academy' },
  { path: '/academy/catalog', section: 'Academy' },
  { path: '/academy/course-manager', section: 'Academy' },
  { path: '/academy/my-training', section: 'Academy' },
  { path: '/academy/signoffs', section: 'Academy' },
  { path: '/academy/manager/create', section: 'Academy' },

  // Employees
  { path: '/employees', section: 'Employees' },

  // GDU
  { path: '/gdu/students', section: 'GDU' },
  { path: '/gdu/visitors', section: 'GDU' },
  { path: '/gdu/events', section: 'GDU' },
  { path: '/gdu/events/new', section: 'GDU' },

  // Growth
  { path: '/growth/events', section: 'Growth' },
  { path: '/growth/goals', section: 'Growth' },
  { path: '/growth/leads', section: 'Growth' },
  { path: '/growth/partners', section: 'Growth' },

  // Marketing
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

  // Med-Ops
  { path: '/med-ops/boards', section: 'Med-Ops' },
  { path: '/med-ops/calculators', section: 'Med-Ops' },
  { path: '/med-ops/facilities', section: 'Med-Ops' },
  { path: '/med-ops/partners', section: 'Med-Ops' },
  { path: '/med-ops/wiki', section: 'Med-Ops' },
  { path: '/med-ops/safety', section: 'Med-Ops' },
  { path: '/med-ops/safety/manage-types', section: 'Med-Ops' },
  { path: '/med-ops/safety/qr-codes', section: 'Med-Ops' },

  // People
  { path: '/people/my-skills', section: 'People' },
  { path: '/people/skill-stats', section: 'People' },

  // Recruiting
  { path: '/recruiting', section: 'Recruiting' },
  { path: '/recruiting/candidates', section: 'Recruiting' },
  { path: '/recruiting/interviews', section: 'Recruiting' },
  { path: '/recruiting/onboarding', section: 'Recruiting' },

  // Roster
  { path: '/roster', section: 'Roster' },

  // Schedule
  { path: '/schedule', section: 'Schedule' },
  { path: '/schedule/builder', section: 'Schedule' },
  { path: '/schedule/services', section: 'Schedule' },
  { path: '/schedule/wizard', section: 'Schedule' },

  // Training
  { path: '/training', section: 'Training' },
];

async function main() {
  console.log('='.repeat(120));
  console.log('COMPREHENSIVE FRONT-END AUDIT — EmployeeGM GreenDog');
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('='.repeat(120));

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  const allResults = [];
  const summary = {
    totalPages: 0,
    ok: 0,
    loadFailed: 0,
    redirectedToLogin: 0,
    withConsoleErrors: 0,
    withJsExceptions: 0,
    withNetworkErrors: 0,
    totalConsoleErrors: 0,
    totalJsExceptions: 0,
    totalNetworkErrors: 0,
    buttonsFound: 0,
    buttonsClicked: 0,
    buttonClickErrors: 0,
    formsFound: 0,
  };

  let currentSection = '';

  for (const route of ALL_ROUTES) {
    if (route.section !== currentSection) {
      currentSection = route.section;
      console.log(`\n${'─'.repeat(100)}`);
      console.log(`SECTION: ${currentSection.toUpperCase()}`);
      console.log('─'.repeat(100));
    }

    const result = {
      path: route.path,
      section: route.section,
      isPublic: route.public || false,
      status: 'unknown',
      httpStatus: null,
      loadTimeMs: 0,
      redirectedTo: null,
      consoleErrors: [],
      consoleWarnings: [],
      jsExceptions: [],
      networkErrors: [],
      buttons: { total: 0, clicked: 0, errors: [] },
      forms: 0,
      vuetifyComponents: 0,
      notes: [],
    };

    // Set up listeners for this navigation
    const consoleHandler = (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        if (text.includes('favicon') || text.includes('manifest') || text.includes('__vite') || text.includes('hot-update')) return;
        result.consoleErrors.push(text.substring(0, 500));
      } else if (type === 'warning') {
        if (text.includes('[Vue warn]') || text.includes('DevTools') || text.includes('Source map') || text.includes('download the Vue Devtools')) return;
        result.consoleWarnings.push(text.substring(0, 300));
      }
    };
    const errorHandler = (err) => {
      result.jsExceptions.push(err.message.substring(0, 500));
    };
    const networkHandler = (request) => {
      const url = request.url();
      if (url.includes('favicon') || url.includes('hot-update') || url.includes('__vite_ping') || url.includes('__nuxt')) return;
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
        timeout: 30000,
      });
      result.httpStatus = response?.status() || null;
      result.loadTimeMs = Date.now() - startTime;

      // Wait for SPA rendering
      await page.waitForTimeout(2500);

      // Check redirect
      const finalPath = new URL(page.url()).pathname;
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

      // Check for error overlays / blank pages
      const pageCheck = await page.evaluate(() => {
        const hasError = !!document.querySelector('.nuxt-error-page, #nuxt-error, [data-v-error]');
        const bodyLen = document.body?.innerText?.trim()?.length || 0;
        const vuetifyCount = document.querySelectorAll('[class*="v-"]').length;
        const btnCount = document.querySelectorAll('button, [role="button"], .v-btn').length;
        const formCount = document.querySelectorAll('form, .v-form').length;
        const linkCount = document.querySelectorAll('a[href]').length;
        const brokenImgs = Array.from(document.querySelectorAll('img')).filter(i => i.naturalWidth === 0 && i.src).map(i => i.src.substring(0, 100));
        return { hasError, bodyLen, vuetifyCount, btnCount, formCount, linkCount, brokenImgs };
      });

      result.vuetifyComponents = pageCheck.vuetifyCount;
      result.buttons.total = pageCheck.btnCount;
      result.forms = pageCheck.formCount;
      summary.buttonsFound += pageCheck.btnCount;
      summary.formsFound += pageCheck.formCount;

      if (pageCheck.hasError) {
        result.notes.push('ERROR OVERLAY DETECTED');
      }
      if (pageCheck.bodyLen < 10 && result.status !== 'redirected-to-login') {
        result.notes.push('PAGE APPEARS BLANK');
      }
      if (pageCheck.brokenImgs.length > 0) {
        result.notes.push(`${pageCheck.brokenImgs.length} broken image(s)`);
      }

      // Click buttons on non-login-redirected pages
      if (result.status !== 'redirected-to-login') {
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
              }));

              if (btnInfo.disabled) continue;
              const lower = btnInfo.text.toLowerCase();
              if (['delete', 'remove', 'destroy', 'logout', 'sign out', 'reset', 'submit', 'save', 'confirm', 'approve', 'reject', 'send', 'publish'].some(w => lower.includes(w))) continue;

              const errsBefore = result.consoleErrors.length + result.jsExceptions.length;
              await btn.click({ timeout: 2000, force: true }).catch(() => {});
              await page.waitForTimeout(300);
              const errsAfter = result.consoleErrors.length + result.jsExceptions.length;

              result.buttons.clicked++;
              summary.buttonsClicked++;

              if (errsAfter > errsBefore) {
                result.buttons.errors.push({ text: btnInfo.text, newErrors: errsAfter - errsBefore });
                summary.buttonClickErrors++;
              }
            } catch (_e) { /* button interaction failed */ }
          }
        } catch (_e) { /* button audit failed */ }

        // Try pressing Escape to close any dialogs opened by button clicks
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(200);
      }

      // Final status determination
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

    // Remove listeners
    page.off('console', consoleHandler);
    page.off('pageerror', errorHandler);
    page.off('requestfailed', networkHandler);

    // Brief pause to avoid overwhelming the dev server
    await new Promise(r => setTimeout(r, 500));

    // Update summary
    summary.totalPages++;
    if (result.status === 'ok') summary.ok++;
    if (result.consoleErrors.length > 0) summary.withConsoleErrors++;
    if (result.jsExceptions.length > 0) summary.withJsExceptions++;
    if (result.networkErrors.length > 0) summary.withNetworkErrors++;
    summary.totalConsoleErrors += result.consoleErrors.length;
    summary.totalJsExceptions += result.jsExceptions.length;
    summary.totalNetworkErrors += result.networkErrors.length;

    allResults.push(result);

    // Print result line
    const icon = { 'ok': '✅', 'has-errors': '⚠️ ', 'js-exception': '❌', 'load-failed': '💥', 'redirected-to-login': '🔒', 'redirected': '↪️ ' }[result.status] || '❓';
    const pad = route.path.padEnd(45);
    console.log(`${icon} ${pad} ${result.loadTimeMs.toString().padStart(5)}ms | Errs:${result.consoleErrors.length} JS:${result.jsExceptions.length} Net:${result.networkErrors.length} Btns:${result.buttons.total}/${result.buttons.clicked} Forms:${result.forms}`);

    // Detail output for problems
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
    result.notes.filter(n => !n.startsWith('Title')).forEach(n => console.log(`   📝 ${n}`));
  }

  await page.close();
  await browser.close();

  // ═══════════════════════════════════════════════
  // FINAL REPORT
  // ═══════════════════════════════════════════════
  console.log('\n' + '═'.repeat(120));
  console.log('                                    AUDIT SUMMARY');
  console.log('═'.repeat(120));
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

  // Problem pages detail
  const problemPages = allResults.filter(r =>
    r.jsExceptions.length > 0 ||
    r.status === 'load-failed' ||
    (r.consoleErrors.length > 0 && r.status !== 'redirected-to-login')
  );

  if (problemPages.length > 0) {
    console.log('\n' + '─'.repeat(120));
    console.log('PROBLEM PAGES REQUIRING ATTENTION:');
    console.log('─'.repeat(120));
    for (const p of problemPages) {
      console.log(`\n  ❌ ${p.path} [${p.section}] — Status: ${p.status}`);
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

  // Pages with warnings (redirected to login but with errors from loading)
  const loginRedirectPages = allResults.filter(r => r.status === 'redirected-to-login');
  const loginPagesWithErrors = loginRedirectPages.filter(r => r.consoleErrors.length > 0 || r.jsExceptions.length > 0);
  if (loginPagesWithErrors.length > 0) {
    console.log('\n' + '─'.repeat(120));
    console.log('PAGES REDIRECTED TO LOGIN WITH ERRORS DURING LOAD:');
    console.log('─'.repeat(120));
    for (const p of loginPagesWithErrors) {
      console.log(`\n  ⚠️  ${p.path} [${p.section}]`);
      if (p.jsExceptions.length) p.jsExceptions.forEach(e => console.log(`     💥 ${e}`));
      if (p.consoleErrors.length) p.consoleErrors.forEach(e => console.log(`     ⚠️  ${e}`));
    }
  }

  // Write JSON
  const report = { summary, results: allResults, timestamp: new Date().toISOString() };
  writeFileSync('/workspaces/EmployeeGM-GreenDog/audit-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Full JSON report: audit-report.json');
  console.log('═'.repeat(120));
}

main().catch(err => {
  console.error('AUDIT SCRIPT CRASHED:', err);
  process.exit(1);
});
