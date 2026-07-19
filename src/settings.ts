// 端末内の保存もの（DESIGN §7・§14）。
// - かずの おおきさ（maxSum）
// - あつめた ほし の累計（totalStars）… ごほうび（スタンプ）のコレクション
// web は localStorage に保存、native はセッション内キャッシュのみ（MVP）。外部送信なし。
// 取得失敗時は既定値にフォールバック。消えても遊びは壊れない（罰・失敗表示はしない）。

import { Platform } from 'react-native';

export type MaxSum = 5 | 10;
const KEY = 'sansu.maxSum';
const STAR_KEY = 'sansu.totalStars';
const TTS_KEY = 'sansu.tts';
const BGM_KEY = 'sansu.bgm';
const DEFAULT: MaxSum = 5;

// 型の都合で最小限だけ宣言（DOM lib に依存しない）。
interface WebStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
function ls(): WebStorage | null {
  if (Platform.OS !== 'web') return null;
  try {
    const s = (globalThis as unknown as { localStorage?: WebStorage }).localStorage;
    return s ?? null;
  } catch {
    return null;
  }
}

// セッション内キャッシュ（native の永続化が無くても同一起動中は保持される）。
let cache: MaxSum | null = null;

export function getMaxSum(): MaxSum {
  if (cache !== null) return cache;
  const store = ls();
  if (store) {
    try {
      const v = store.getItem(KEY);
      if (v === '10') return (cache = 10);
      if (v === '5') return (cache = 5);
    } catch {
      // 無視して既定へ
    }
  }
  return (cache = DEFAULT);
}

export function setMaxSum(v: MaxSum): void {
  cache = v;
  const store = ls();
  if (store) {
    try {
      store.setItem(KEY, String(v));
    } catch {
      // 保存できなくても遊びは壊さない
    }
  }
}

// ── あつめた ほし（累計スタンプ）───────────────────────────────
// 1問クリアごとに +1 する“ごほうび”の合計。減ることはない（マイナス要素ゼロ）。
// リセットはおとなモードからのみ。数字スコアではなく「集めた⭐の数」を貯める。
let starCache: number | null = null;

export function getTotalStars(): number {
  if (starCache !== null) return starCache;
  const store = ls();
  if (store) {
    try {
      const v = store.getItem(STAR_KEY);
      if (v != null) {
        const n = parseInt(v, 10);
        if (Number.isFinite(n) && n >= 0) return (starCache = n);
      }
    } catch {
      // 無視して既定（0）へ
    }
  }
  return (starCache = 0);
}

// n 個の⭐を加える（既定1）。新しい累計を返す。
export function addStars(n = 1): number {
  const next = getTotalStars() + Math.max(0, n);
  starCache = next;
  const store = ls();
  if (store) {
    try {
      store.setItem(STAR_KEY, String(next));
    } catch {
      // 保存できなくても遊びは壊さない（セッション内キャッシュは保持）
    }
  }
  return next;
}

// 累計を0に戻す（おとなモード専用）。
export function resetStars(): void {
  starCache = 0;
  const store = ls();
  if (store) {
    try {
      store.setItem(STAR_KEY, '0');
    } catch {
      // 無視
    }
  }
}

// ── よみあげ（読み上げ／TTS）オン/オフ ───────────────────────────────
// 正解「せいかい！」・誤答「おしい／あれれ」・タイトル・がんばりカードの読み上げ（DESIGN §4）。
// 既定は オン。壊れた値は既定へ。音が使えない・うるさい環境では おとなモードで オフにできる。
let ttsCache: boolean | null = null;

export function getTtsOn(): boolean {
  if (ttsCache !== null) return ttsCache;
  const store = ls();
  if (store) {
    try {
      const v = store.getItem(TTS_KEY);
      if (v === 'off') return (ttsCache = false);
      if (v === 'on') return (ttsCache = true);
    } catch {
      // 無視して既定へ
    }
  }
  return (ttsCache = true);
}

export function setTtsOn(on: boolean): void {
  ttsCache = on;
  const store = ls();
  if (store) {
    try {
      store.setItem(TTS_KEY, on ? 'on' : 'off');
    } catch {
      // 無視
    }
  }
}

// ── BGM（おんがく）オン/オフ ────────────────────────────────────────
// ぴよぴよランド共通のオルゴール風BGM（bgm/engine）のオン/オフ。よみあげ（TTS）とは独立。
// 既定は オン（ちいさな音量）。壊れた値は既定へ。しずかに あそびたい ときは おとなモードで オフに。
// キーは4アプリ共通規約の sansu.bgm（localStorage）。
let bgmCache: boolean | null = null;

export function getBgmOn(): boolean {
  if (bgmCache !== null) return bgmCache;
  const store = ls();
  if (store) {
    try {
      const v = store.getItem(BGM_KEY);
      if (v === 'off') return (bgmCache = false);
      if (v === 'on') return (bgmCache = true);
    } catch {
      // 無視して既定へ
    }
  }
  return (bgmCache = true);
}

export function setBgmOn(on: boolean): void {
  bgmCache = on;
  const store = ls();
  if (store) {
    try {
      store.setItem(BGM_KEY, on ? 'on' : 'off');
    } catch {
      // 無視
    }
  }
}