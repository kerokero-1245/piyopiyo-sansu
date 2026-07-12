// かずの おおきさ（maxSum）の保存。DESIGN §7。
// web は localStorage に保存、native はセッション内キャッシュのみ（MVP）。外部送信なし。
// 取得失敗時は既定 5 にフォールバック。消えても遊びは壊れない。

import { Platform } from 'react-native';

export type MaxSum = 5 | 10;
const KEY = 'sansu.maxSum';
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