// @ts-check
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = 'file://' + path.resolve(__dirname);
const url = (page) => `${BASE}/${page}`;

let browser, context, page;
const results = [];
let passed = 0, failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅  ${name}`);
    results.push({ name, status: 'pass' });
    passed++;
  } catch (e) {
    console.log(`  ❌  ${name}`);
    console.log(`       ${e.message.split('\n')[0]}`);
    results.push({ name, status: 'fail', error: e.message.split('\n')[0] });
    failed++;
  }
}

async function expect(val, label) {
  return {
    toBe: (expected) => { if (val !== expected) throw new Error(`Expected "${expected}" but got "${val}" — ${label}`); },
    toContain: (sub) => { if (!String(val).includes(sub)) throw new Error(`Expected to contain "${sub}" but got "${val}" — ${label}`); },
    toBeGreaterThan: (n) => { if (!(val > n)) throw new Error(`Expected > ${n} but got ${val} — ${label}`); },
    toBeTruthy: () => { if (!val) throw new Error(`Expected truthy but got "${val}" — ${label}`); },
  };
}

async function nav(p) {
  await page.goto(url(p), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
}

(async () => {
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext();
  page = await context.newPage();

  // ─────────────────────────────────────────────
  console.log('\n🏠  index.html — Launcher');
  // ─────────────────────────────────────────────
  await nav('index.html');

  await test('Page title is "My Apps"', async () => {
    const t = await page.title();
    (await expect(t, 'title')).toBe('My Apps');
  });

  await test('Shows 3 app cards', async () => {
    const count = await page.locator('.app-card').count();
    (await expect(count, 'card count')).toBe(3);
  });

  await test('To-Do Lists card links to todo.html', async () => {
    const href = await page.locator('.app-card[href="todo.html"]').getAttribute('href');
    (await expect(href, 'todo link')).toBe('todo.html');
  });

  await test('Planner card links to planner.html', async () => {
    const href = await page.locator('.app-card[href="planner.html"]').getAttribute('href');
    (await expect(href, 'planner link')).toBe('planner.html');
  });

  await test('Daily Inspiration card links to inspiration.html', async () => {
    const href = await page.locator('.app-card[href="inspiration.html"]').getAttribute('href');
    (await expect(href, 'inspiration link')).toBe('inspiration.html');
  });

  await test('Reviews button exists and links to comments.html', async () => {
    const href = await page.locator('.reviews-btn').getAttribute('href');
    (await expect(href, 'reviews btn')).toBe('comments.html');
  });

  // ─────────────────────────────────────────────
  console.log('\n🗒️  todo.html — To-Do Lists');
  // ─────────────────────────────────────────────
  await nav('todo.html');

  await test('Page title contains To-Do', async () => {
    const t = await page.title();
    (await expect(t, 'title')).toContain('To-Do');
  });

  await test('Header shows To-Do Lists', async () => {
    const h1 = await page.locator('h1').first().textContent();
    (await expect(h1, 'h1')).toContain('To-Do');
  });

  await test('Home button points to index.html', async () => {
    const href = await page.locator('a[href="index.html"]').first().getAttribute('href');
    (await expect(href, 'home link')).toBe('index.html');
  });

  await test('Planner button is left of Home button', async () => {
    const links = await page.locator('.home-header a').all();
    const texts = await Promise.all(links.map(l => l.textContent()));
    const plannerIdx = texts.findIndex(t => t.includes('Planner'));
    const homeIdx = texts.findIndex(t => t.includes('Home'));
    if (plannerIdx === -1 || homeIdx === -1) throw new Error('Could not find Planner or Home link');
    if (plannerIdx >= homeIdx) throw new Error(`Planner (${plannerIdx}) should be before Home (${homeIdx})`);
  });

  await test('Create list input is visible', async () => {
    const visible = await page.locator('input[placeholder*="List name"], input[placeholder*="list"]').first().isVisible();
    (await expect(visible, 'input visible')).toBeTruthy();
  });

  await test('Can create a new list', async () => {
    await page.locator('input').first().fill('E2E Test List');
    await page.locator('button').filter({ hasText: /create/i }).first().click();
    await page.waitForTimeout(300);
    const listText = await page.locator('body').textContent();
    (await expect(listText, 'list created')).toContain('E2E Test List');
  });

  // ─────────────────────────────────────────────
  console.log('\n📝  todo-list.html — Task List');
  // ─────────────────────────────────────────────
  // createList() auto-redirects to todo-list.html immediately
  await nav('todo.html');
  await page.locator('input').first().fill('E2E Tasks');
  await Promise.all([
    page.waitForURL('**/todo-list.html**', { timeout: 5000 }),
    page.locator('button').filter({ hasText: /create/i }).first().click(),
  ]);
  await page.waitForTimeout(300);

  await test('Task list page loads', async () => {
    const url2 = page.url();
    (await expect(url2, 'url')).toContain('todo-list.html');
  });

  await test('Back link to todo.html exists', async () => {
    const href = await page.locator('a[href="todo.html"]').first().getAttribute('href');
    (await expect(href, 'back link')).toBe('todo.html');
  });

  await test('Home link exists on task list page', async () => {
    const href = await page.locator('a[href="index.html"]').first().getAttribute('href');
    (await expect(href, 'home link')).toBe('index.html');
  });

  await test('Can add a task', async () => {
    await page.locator('#taskText').fill('Test task from E2E');
    await page.locator('.add-task-btn').click();
    await page.waitForTimeout(400);
    const body = await page.locator('body').textContent();
    (await expect(body, 'task added')).toContain('Test task from E2E');
  });

  // ─────────────────────────────────────────────
  console.log('\n🗓️  planner.html — Planner Today');
  // ─────────────────────────────────────────────
  await nav('planner.html');

  await test('Page title contains Planner', async () => {
    const t = await page.title();
    (await expect(t, 'title')).toContain('Planner');
  });

  await test('Nav bar renders', async () => {
    const nav2 = await page.locator('.nav-bar').isVisible();
    (await expect(nav2, 'nav visible')).toBeTruthy();
  });

  await test('Nav has Calendar link', async () => {
    const href = await page.locator('a[href="calendar.html"]').first().getAttribute('href');
    (await expect(href, 'calendar link')).toBe('calendar.html');
  });

  await test('Nav has Home link', async () => {
    const href = await page.locator('a[href="index.html"]').first().getAttribute('href');
    (await expect(href, 'home link')).toBe('index.html');
  });

  await test('Today date is shown', async () => {
    const body = await page.locator('body').textContent();
    const year = new Date().getFullYear().toString();
    (await expect(body, 'year visible')).toContain(year);
  });

  // ─────────────────────────────────────────────
  console.log('\n📅  calendar.html — Calendar');
  // ─────────────────────────────────────────────
  await nav('calendar.html');

  await test('Calendar grid renders', async () => {
    const grid = await page.locator('#calGrid').isVisible();
    (await expect(grid, 'cal grid')).toBeTruthy();
  });

  await test('Month label is shown', async () => {
    const label = await page.locator('#calLabel').textContent();
    const year = new Date().getFullYear().toString();
    (await expect(label, 'month label')).toContain(year);
  });

  await test('Calendar has 7 day-of-week headers', async () => {
    const dows = await page.locator('.cal-dow').count();
    (await expect(dows, 'day headers')).toBe(7);
  });

  await test('Korean holiday cells are marked (holiday class exists)', async () => {
    // Navigate to a month known to have KR holidays (May 2026 has 어린이날)
    const currentMonth = await page.locator('#calLabel').textContent();
    // Check if any holiday class exists in current month or navigate to May 2026
    let holidayCount = await page.locator('.cal-day.holiday').count();
    // Try clicking forward to find a month with holidays
    if (holidayCount === 0) {
      for (let i = 0; i < 12; i++) {
        await page.locator('button').filter({ hasText: '→' }).first().click();
        await page.waitForTimeout(100);
        holidayCount = await page.locator('.cal-day.holiday').count();
        if (holidayCount > 0) break;
      }
    }
    (await expect(holidayCount, 'holiday cells')).toBeGreaterThan(0);
  });

  await test('Clicking a holiday day shows holiday name in panel', async () => {
    const holidayCell = page.locator('.cal-day.holiday').first();
    await holidayCell.click();
    await page.waitForTimeout(400);
    const panel = await page.evaluate(() => document.getElementById('dayPanel').innerHTML);
    if (!panel.includes('hol-banner') && !panel.includes('🇰🇷')) {
      throw new Error(`Holiday banner not found in panel HTML: ${panel.slice(0,120)}`);
    }
  });

  await test('Prev/Next month navigation works', async () => {
    const before = await page.locator('#calLabel').textContent();
    await page.locator('button').filter({ hasText: '←' }).first().click();
    await page.waitForTimeout(200);
    const after = await page.locator('#calLabel').textContent();
    if (before === after) throw new Error('Month did not change after clicking ←');
  });

  // ─────────────────────────────────────────────
  console.log('\n✅  habits.html — Habits');
  // ─────────────────────────────────────────────
  await nav('habits.html');

  await test('Habits page loads with nav', async () => {
    const nav2 = await page.locator('.nav-bar').isVisible();
    (await expect(nav2, 'nav')).toBeTruthy();
  });

  await test('Habits nav link is active', async () => {
    const active = await page.locator('.nav-link.active').textContent();
    (await expect(active, 'active nav')).toContain('Habits');
  });

  await test('Home link present on habits page', async () => {
    const href = await page.locator('a[href="index.html"]').first().getAttribute('href');
    (await expect(href, 'home')).toBe('index.html');
  });

  // ─────────────────────────────────────────────
  console.log('\n🎯  projects.html — Projects');
  // ─────────────────────────────────────────────
  await nav('projects.html');

  await test('Projects page loads with nav', async () => {
    const nav2 = await page.locator('.nav-bar').isVisible();
    (await expect(nav2, 'nav')).toBeTruthy();
  });

  await test('Projects nav link is active', async () => {
    const active = await page.locator('.nav-link.active').textContent();
    (await expect(active, 'active nav')).toContain('Projects');
  });

  // ─────────────────────────────────────────────
  console.log('\n✨  inspiration.html — Daily Inspiration');
  // ─────────────────────────────────────────────
  await nav('inspiration.html');

  await test('Inspiration page loads', async () => {
    const body = await page.locator('body').textContent();
    (await expect(body.length, 'body has content')).toBeGreaterThan(100);
  });

  await test('Home button exists', async () => {
    const homeBtn = await page.locator('a[href="index.html"]').count();
    (await expect(homeBtn, 'home btn count')).toBeGreaterThan(0);
  });

  await test('Quote text is visible', async () => {
    // Look for a quote container or any large text block
    const body = await page.locator('body').textContent();
    (await expect(body.length, 'quote content')).toBeGreaterThan(200);
  });

  // ─────────────────────────────────────────────
  console.log('\n💬  comments.html — Reviews');
  // ─────────────────────────────────────────────
  await nav('comments.html');

  await test('Reviews page title correct', async () => {
    const t = await page.title();
    (await expect(t, 'title')).toContain('Reviews');
  });

  await test('Home link exists', async () => {
    const href = await page.locator('a[href="index.html"]').first().getAttribute('href');
    (await expect(href, 'home')).toBe('index.html');
  });

  await test('Seed reviews are loaded (review cards present)', async () => {
    await page.waitForTimeout(500);
    const cards = await page.locator('.review-card').count();
    (await expect(cards, 'review cards')).toBeGreaterThan(0);
  });

  await test('Rating bars are visible', async () => {
    const bars = await page.locator('.bar-track').count();
    (await expect(bars, 'rating bars')).toBe(5);
  });

  await test('Average rating score is calculated and shown', async () => {
    const num = await page.evaluate(() => document.getElementById('bigNum')?.textContent?.trim() || '');
    if (!num || num === '') throw new Error('bigNum element not found');
    // Should be a number like "4.3" or "—" if no reviews
    const valid = num === '—' || !isNaN(parseFloat(num));
    if (!valid) throw new Error(`Unexpected rating value: "${num}"`);
  });

  await test('Write a Review button opens modal', async () => {
    await page.locator('.write-btn').click();
    await page.waitForTimeout(300);
    const modal = await page.locator('.modal-overlay.open').isVisible();
    (await expect(modal, 'modal open')).toBeTruthy();
  });

  await test('Can fill and submit a review', async () => {
    // Pick 5 stars
    await page.locator('.mstar').nth(4).click();
    // Write review text
    await page.locator('#reviewText').fill('Great app! E2E test review.');
    // Submit
    await page.locator('#submitBtn').click();
    await page.waitForTimeout(400);
    const body = await page.locator('body').textContent();
    (await expect(body, 'review submitted')).toContain('Great app! E2E test review.');
  });

  await test('Sort tabs switch filter', async () => {
    await page.locator('.stab').filter({ hasText: 'Recent' }).click();
    await page.waitForTimeout(200);
    const active = await page.locator('.stab.active').textContent();
    (await expect(active, 'active tab')).toContain('Recent');
  });

  // ─────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────
  await browser.close();

  console.log('\n' + '─'.repeat(48));
  console.log(`  Results: ${passed} passed, ${failed} failed  (${passed+failed} total)`);
  console.log('─'.repeat(48));

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`  ❌ ${r.name}`);
      console.log(`     ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n  All tests passed! 🎉');
    process.exit(0);
  }
})();
