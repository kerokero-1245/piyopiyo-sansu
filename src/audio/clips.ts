// 音声クリップ再生（tier1 / DESIGN §4 の3段構え「①同梱クリップ」担当）。
// web では HTMLAudioElement で同梱クリップ（VOICEVOX 事前生成）を鳴らす。native は無音スタブ。
//
// - iOS Safari の自動再生制限: 音は最初のユーザー操作より前には鳴らせない。タイトルの「あそぶ」で
//   warmUpClips() を1回呼び、（クリップがあれば）muted で1つ触ってエンジンをアンロックする。
//   以降は正解時の自動再生（タップ外）も鳴る。1ページロードにつき1回で足りる。
// - クリップ未同梱（voiceClips の CLIP_URLS に無い基名）なら no-op。呼び出し側（voice.ts）が
//   speechSynthesis（tier2）へフォールバックする。
// - 外部送信ゼロ: 同梱アセットのみ。ネットワークは使わない。
//
// DOM lib に依存しないよう、必要な形だけ最小宣言して globalThis から取り出す。

import { Platform } from 'react-native';
import { CLIP_URLS, hasClip } from './voiceClips';

interface AudioEl {
  play(): Promise<void> | void;
  pause(): void;
  currentTime: number;
  muted: boolean;
  onended: (() => void) | null;
  onerror: (() => void) | null;
}
type AudioCtor = new (src?: string) => AudioEl;

function getAudioCtor(): AudioCtor | null {
  if (Platform.OS !== 'web') return null;
  try {
    const g = globalThis as unknown as { Audio?: AudioCtor };
    return g.Audio ?? null;
  } catch {
    return null;
  }
}

// この基名のクリップを tier1 で鳴らせるか（native/非対応/未同梱では false）。
export function isClipAvailable(name: string | undefined): boolean {
  return getAudioCtor() != null && hasClip(name);
}

let current: AudioEl | null = null;
// 再生中クリップの「終了通知」（voice.ts のダッキング解除など）。多重発火を防ぐため、
// 自然終了 / エラー / 差し替え / cancel のいずれか最初の1回だけ呼ぶ（呼んだら null にする）。
let currentEnd: (() => void) | null = null;

function fireCurrentEnd(): void {
  const fn = currentEnd;
  currentEnd = null;
  if (fn) {
    try {
      fn();
    } catch {
      // 通知先が失敗しても再生・遊びは壊さない
    }
  }
}

// 直前の再生を止める（発声が重ならないように）。停止＝終了通知（ダッキング解除）も1回発火。
export function cancelClip(): void {
  try {
    if (current) current.pause();
  } catch {
    // 無視
  }
  current = null;
  fireCurrentEnd();
}

// name のクリップを再生する。鳴らせたら true、無理なら false（呼び出し側が tier2 へ）。
// onEnd: 再生が終わった（自然終了 / エラー / 差し替え / cancel）ときに1回だけ呼ばれる（任意）。
export function playClip(name: string, onEnd?: () => void): boolean {
  const A = getAudioCtor();
  if (!A || !hasClip(name)) return false;
  try {
    cancelClip(); // 直前のクリップを止め、その終了通知を発火してから始める
    const a = new A(CLIP_URLS[name]);
    current = a;
    currentEnd = onEnd ?? null;
    // 自然終了・エラーで終了通知（この要素がまだ current のときだけ）。
    a.onended = () => {
      if (current === a) {
        current = null;
        fireCurrentEnd();
      }
    };
    a.onerror = () => {
      if (current === a) {
        current = null;
        fireCurrentEnd();
      }
    };
    const p = a.play();
    // play() の Promise 拒否（ユーザー操作前など）は握りつぶす（遊びは壊さない）。再生できな
    // かったときも終了通知は出す（ダッキングを解除して BGM を元の音量へ戻す）。
    if (p && typeof (p as Promise<void>).catch === 'function') {
      (p as Promise<void>).catch(() => {
        if (current === a) {
          current = null;
          fireCurrentEnd();
        }
      });
    }
    return true;
  } catch {
    return false;
  }
}

// 「あそぶ」タップで1回呼ぶ。クリップがあれば muted で1つ触ってアンロック（iOS Safari 対策）。
// クリップ未同梱なら no-op。
let warmed = false;
export function warmUpClips(): void {
  if (warmed) return;
  warmed = true;
  const A = getAudioCtor();
  if (!A) return;
  const first = Object.keys(CLIP_URLS)[0];
  if (!first) return; // クリップ未同梱: 何もしない
  try {
    const a = new A(CLIP_URLS[first]);
    a.muted = true;
    const p = a.play();
    if (p && typeof (p as Promise<void>).then === 'function') {
      (p as Promise<void>)
        .then(() => {
          try {
            a.pause();
            a.currentTime = 0;
          } catch {
            // 無視
          }
        })
        .catch(() => {});
    }
  } catch {
    // アンロックできなくても遊びは壊さない
  }
}
