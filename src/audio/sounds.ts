// 効果音まわり。MVP は外部音声ファイルを同梱しない方針なので、web ではブラウザ内蔵の
// Web Audio API でごく短い音を「合成」して鳴らす（外部素材ゼロ）。おつかいめいろと同方式。
//
// - 音は必ず「ユーザーのタップ起点」で鳴らす（ボタン押下／その後の演出）ので iOS Safari の
//   自動再生制限にかからない。
// - native（iOS/Android 実機）では現状なにも鳴らさない“無音スタブ”。フェーズ2で expo-audio に
//   差し替える際は本モジュールの中身だけ置き換えればよい（呼び出し側は変更不要）。

import { Platform } from 'react-native';

export type SoundName =
  | 'tap' // ボタン反応
  | 'appear' // モノが1つ ふえる（歩いてくる）
  | 'eat' // モノが1つ 食べられて消える
  | 'wrong' // まちがい（罰ではないやさしい合図）
  | 'star' // ⭐スタンプ獲得（1問クリア）ぽん・きらっ
  | 'clear'; // セット完了 ファンファーレ

interface Note {
  freq: number;
  dur: number; // 秒
  type: OscillatorType;
}

// name ごとの音色。強い音を避け、やさしい音を意図（DESIGN §4 感覚にやさしく）。
const TONES: Record<SoundName, Note[]> = {
  tap: [{ freq: 660, dur: 0.08, type: 'sine' }],
  appear: [
    { freq: 523, dur: 0.06, type: 'triangle' },
    { freq: 784, dur: 0.09, type: 'triangle' }, // ぴょこっと上がる
  ],
  eat: [
    { freq: 360, dur: 0.07, type: 'triangle' },
    { freq: 200, dur: 0.12, type: 'sine' }, // むぐっと下がる
  ],
  wrong: [
    { freq: 392, dur: 0.12, type: 'sine' },
    { freq: 330, dur: 0.16, type: 'sine' }, // ゆるく下降（責めない）
  ],
  star: [
    { freq: 784, dur: 0.07, type: 'triangle' }, // ぽん
    { freq: 1319, dur: 0.16, type: 'sine' }, // きらっ（高いミ）
  ],
  clear: [
    { freq: 523, dur: 0.12, type: 'sine' }, // ド
    { freq: 659, dur: 0.12, type: 'sine' }, // ミ
    { freq: 784, dur: 0.12, type: 'sine' }, // ソ
    { freq: 1047, dur: 0.3, type: 'sine' }, // 高いド
  ],
};

// AudioContext は web でのみ。native/非対応では null のまま無音。
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (Platform.OS !== 'web') return null;
  try {
    if (!ctx) {
      const g = globalThis as unknown as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      };
      const AC = g.AudioContext ?? g.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    // ユーザー操作起点で resume（iOS Safari 対策）。
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

// やわらかいエンベロープで1音鳴らす（プチッというクリック音を避ける）。
function tone(c: AudioContext, freq: number, dur: number, type: OscillatorType, at: number): void {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.14, at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

export function playSound(name: SoundName): void {
  const c = getCtx();
  if (!c) return; // native / 非対応環境では無音（MVP許容）
  try {
    let t = c.currentTime;
    for (const note of TONES[name]) {
      tone(c, note.freq, note.dur, note.type, t);
      t += note.dur * 0.9;
    }
  } catch {
    // 音が出せなくても遊びは壊さない。
  }
}

// 数え上げの1音。index が増えるほど半音ずつ高くする（1…2…3! と上がっていく）。
export function playCountTone(index: number): void {
  const c = getCtx();
  if (!c) return;
  try {
    const base = 523; // ド
    const freq = base * Math.pow(2, Math.min(index, 12) / 12);
    tone(c, freq, 0.2, 'sine', c.currentTime);
  } catch {
    // 無視
  }
}