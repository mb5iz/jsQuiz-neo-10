const { test, expect } = require('@playwright/test');
const path = require('path');

const STUDENT_FILE = process.env.STUDENT_FILE;

test.beforeAll(() => {
  if (!STUDENT_FILE) throw new Error('STUDENT_FILE 環境変数が設定されていません');
});

function resolveFileUrl() {
  return `file://${path.resolve(__dirname, '..', STUDENT_FILE)}`;
}

// 空白のゆらぎ（余分なスペース等）だけは許容して比較する
function normalize(text) {
  return text.replace(/\s+/g, ' ').trim();
}

const EXPECTED_PROFILES = [
  '☕ 青山ひかり（店長）',
  '🍵 井上たくみ（バリスタ）',
  '🍰 宇野さくら（パティシエ）',
];

// 表示されている .profile-card のテキストを順に返す
async function cardTexts(page) {
  const texts = await page.$$eval('.profile-card', (els) =>
    els.map((e) => e.textContent)
  );
  return texts.map(normalize);
}

// CDN（Babel / esm.sh）の読み込みと React の描画を待つ
async function gotoAndWaitRender(page) {
  await page.goto(resolveFileUrl());
  await page.waitForSelector('.profile-card', { timeout: 30000 });
}

test('プロフィールカードが3枚描画される', async ({ page }) => {
  await gotoAndWaitRender(page);
  expect(await page.locator('.profile-list .profile-card').count()).toBe(3);
});

test('各カードに props の内容（絵文字・名前・役職）が表示される', async ({ page }) => {
  await gotoAndWaitRender(page);
  expect(await cardTexts(page)).toEqual(EXPECTED_PROFILES);
});

test('Profile は props で受け取った値を JSX に埋め込んでいる', async ({ page }) => {
  await gotoAndWaitRender(page);
  // App のデータに無いテスト用 props を直接渡す → props を使っていないと通らない
  const result = await page.evaluate(() =>
    window.__quizRenderProfile({
      name: 'テスト名前',
      role: 'テスト役職',
      emoji: '🅰',
    })
  );
  // <li className="profile-card"> の形になっているか
  expect(result.html).toContain('<li');
  expect(result.html).toContain('profile-card');
  // {emoji} {name}（{role}）の形で埋め込まれているか
  expect(normalize(result.text)).toBe('🅰 テスト名前（テスト役職）');
});
