import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const behaviorsJs = readFileSync(resolve('behaviors.js'), 'utf8');

async function loadBehaviors(page, bodyHtml = '') {
  await page.setContent(`<!DOCTYPE html><html><body>${bodyHtml}</body></html>`);
  await page.addScriptTag({ content: behaviorsJs });
}

test('define attaches behavior to element', async ({ page }) => {
  await loadBehaviors(page, '<div id="target"></div>');
  const result = await page.evaluate(() => {
    behaviors.define(document.getElementById('target'), { count: 5 }, []);
    return document.getElementById('target').$.count;
  });
  expect(result).toBe(5);
});

test('event listeners fire via handleEvent', async ({ page }) => {
  await loadBehaviors(page, '<button id="btn"></button>');
  const result = await page.evaluate(() => {
    behaviors.define(document.getElementById('btn'), null, [
      { type: 'click', action() { this.element.setAttribute('data-clicked', 'true'); } }
    ]);
    document.getElementById('btn').click();
    return document.getElementById('btn').getAttribute('data-clicked');
  });
  expect(result).toBe('true');
});

test('behavior.element returns the DOM element', async ({ page }) => {
  await loadBehaviors(page, '<div id="el"></div>');
  const result = await page.evaluate(() => {
    behaviors.define(document.getElementById('el'), { x: 1 }, []);
    return document.getElementById('el').$.element.id;
  });
  expect(result).toBe('el');
});

test('listener filters by key', async ({ page }) => {
  await loadBehaviors(page, '<input id="inp" />');
  const result = await page.evaluate(() => {
    let keys = [];
    behaviors.define(document.getElementById('inp'), null, [
      { type: 'keydown', key: 'Enter', action(ev) { this.element.setAttribute('data-key', ev.key); } }
    ]);
    const inp = document.getElementById('inp');
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return inp.getAttribute('data-key');
  });
  expect(result).toBe('Enter');
});

test('$ lazily creates empty behavior', async ({ page }) => {
  await loadBehaviors(page, '<div id="lazy"></div>');
  const result = await page.evaluate(() => {
    const el = document.getElementById('lazy');
    return el.$.element.id;
  });
  expect(result).toBe('lazy');
});

test('getTarget finds preceding non-script sibling', async ({ page }) => {
  await page.setContent(`<!DOCTYPE html><html><body>
    <div id="target"></div><style></style><script id="s"></script>
  </body></html>`);
  await page.addScriptTag({ content: behaviorsJs });
  const result = await page.evaluate(() => {
    return BehaviorRegistry.getTarget(document.getElementById('s')).id;
  });
  expect(result).toBe('target');
});

test('script[for] auto-registers on DOMContentLoaded', async ({ page }) => {
  await page.setContent(`<!DOCTYPE html><html><body>
    <div id="comp"></div>
    <script for>({ val: 42, listeners: [] })</script>
    <script>${behaviorsJs}</script>
  </body></html>`);
  const result = await page.evaluate(() => document.getElementById('comp').$.val);
  expect(result).toBe(42);
});
