import { test, expect } from '@playwright/test';

test('handleEvent protocol works with addEventListener', async ({ page }) => {
  await page.setContent('<!DOCTYPE html><html><body><div id="t"></div></body></html>');
  const result = await page.evaluate(() => {
    let called = false;
    let obj = { handleEvent() { called = true; } };
    document.getElementById('t').addEventListener('click', obj);
    document.getElementById('t').click();
    return called;
  });
  expect(result).toBe(true);
});

test('{ once: true } removes listener after firing', async ({ page }) => {
  await page.setContent('<!DOCTYPE html><html><body><div id="t"></div></body></html>');
  const result = await page.evaluate(() => {
    let count = 0;
    document.getElementById('t').addEventListener('click', () => count++, { once: true });
    document.getElementById('t').click();
    document.getElementById('t').click();
    return count;
  });
  expect(result).toBe(1);
});

test('composedPath returns target to window order', async ({ page }) => {
  await page.setContent('<!DOCTYPE html><html><body><div id="parent"><span id="child"></span></div></body></html>');
  const result = await page.evaluate(() => {
    let path;
    window.addEventListener('click', (e) => { path = e.composedPath(); }, true);
    document.getElementById('child').click();
    return [path[0].id, path[1].id, path.at(-1) === window];
  });
  expect(result).toEqual(['child', 'parent', true]);
});

test('window capture fires before element bubble', async ({ page }) => {
  await page.setContent('<!DOCTYPE html><html><body><div id="t"></div></body></html>');
  const result = await page.evaluate(() => {
    let order = [];
    window.addEventListener('click', () => order.push('capture'), true);
    document.getElementById('t').addEventListener('click', () => order.push('bubble'));
    document.getElementById('t').click();
    return order;
  });
  expect(result).toEqual(['capture', 'bubble']);
});

test('{ once: true, capture: true } works together', async ({ page }) => {
  await page.setContent('<!DOCTYPE html><html><body><div id="t"></div></body></html>');
  const result = await page.evaluate(() => {
    let count = 0;
    document.getElementById('t').addEventListener('click', () => count++, { once: true, capture: true });
    document.getElementById('t').click();
    document.getElementById('t').click();
    return count;
  });
  expect(result).toBe(1);
});

test('dispatchEvent triggers window capture listeners', async ({ page }) => {
  await page.setContent('<!DOCTYPE html><html><body><div id="t"></div></body></html>');
  const result = await page.evaluate(() => {
    let called = false;
    window.addEventListener('click', () => { called = true; }, true);
    document.getElementById('t').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return called;
  });
  expect(result).toBe(true);
});

test('WeakRef.deref returns element while in DOM', async ({ page }) => {
  await page.setContent('<!DOCTYPE html><html><body><div id="t"></div></body></html>');
  const result = await page.evaluate(() => {
    let ref = new WeakRef(document.getElementById('t'));
    return ref.deref()?.id;
  });
  expect(result).toBe('t');
});

test('Object.create(proto) gives access to proto methods via this', async ({ page }) => {
  await page.setContent('<!DOCTYPE html><html><body></body></html>');
  const result = await page.evaluate(() => {
    let proto = { greet() { return 'hello ' + this.name; } };
    let instance = Object.create(proto);
    instance.name = 'world';
    return instance.greet();
  });
  expect(result).toBe('hello world');
});

test('element.matches works with custom attribute selectors', async ({ page }) => {
  await page.setContent('<!DOCTYPE html><html><body><div mk-is="abc123"></div></body></html>');
  const result = await page.evaluate(() => {
    return document.querySelector('div').matches('[mk-is="abc123"]');
  });
  expect(result).toBe(true);
});

test('listener added during capture fires in same dispatch cycle', async ({ page }) => {
  await page.setContent('<!DOCTYPE html><html><body><div id="t"></div></body></html>');
  const result = await page.evaluate(() => {
    let fired = false;
    window.addEventListener('click', (e) => {
      document.getElementById('t').addEventListener('click', () => { fired = true; }, { once: true });
    }, true);
    document.getElementById('t').click();
    return fired;
  });
  expect(result).toBe(true);
});

test('dispatchEvent is synchronous', async ({ page }) => {
  await page.setContent('<!DOCTYPE html><html><body><div id="t"></div></body></html>');
  const result = await page.evaluate(() => {
    let value = 'before';
    document.getElementById('t').addEventListener('click', () => { value = 'during'; });
    document.getElementById('t').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return value;
  });
  expect(result).toBe('during');
});
