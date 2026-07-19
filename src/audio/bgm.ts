// BGM の入口（さんすう用の薄いラッパ）。画面はこのモジュールだけを呼ぶ。
// 実体は bgm/engine（ぴよぴよランド4アプリ共通のオルゴール風BGM・Web Audio 手続き生成ループ）。
// クレジット: BGM: オリジナル（Web Audio 生成）。録音物・外部素材は使わない。
//
// 方針（既存の効果音／声と同じ）:
//   - web でのみ鳴らす。native / AudioContext 非対応では全 API が無害な no-op（クラッシュ厳禁）。
//   - 音は必ず「ユーザー操作起点」で開始する（iOS Safari の自動再生制限）。開始はタイトルの
//     タップ／「あそぶ」のアンロックと同じハンドラ内（warmUpVoice の隣）で startSansuBgm() を呼ぶ。
//   - 効果音（sounds.ts）と同じ AudioContext を共有する（configureBgm({ getCtx }) に注入）。
//   - 声（clips/TTS）の再生中は voice.ts が duckBgm()／unduckBgm() で自動的に音量を下げる。
//   - オン/オフは おとなモードの設定（settings: sansu.bgm、既定オン）。

import { configureBgm, startBgm, stopBgm, setBgmEnabled } from './bgm/engine';
import { getAudioContext } from './sounds';
import { getBgmOn } from '../settings';

const SONG = 'sansu' as const; // さんすう＝F メジャーペンタ・76BPM「ほのぼの」

// configureBgm は ctx を作らず getter を覚えるだけなので、いつ呼んでも安全。1回で足りる。
let configured = false;
function ensureConfigured(): void {
  if (configured) return;
  configured = true;
  try {
    configureBgm({ getCtx: () => getAudioContext() });
  } catch {
    // 設定できなくても遊びは壊さない
  }
}

/**
 * さんすうBGMを開始（必ずユーザー操作起点で呼ぶ前提）。
 * タイトルのタップ／「あそぶ」の warmUpVoice() と同じハンドラ内で呼ぶ。
 * - 保存された設定（sansu.bgm、既定オン）を反映してから開始する。
 * - 同一曲での再呼び出しは冪等（engine 側で無視）なので、両ハンドラから呼んでも二重再生しない。
 */
export function startSansuBgm(): void {
  ensureConfigured();
  try {
    setBgmEnabled(getBgmOn()); // 保存設定を反映（オフ保存なら開始しても鳴らさない）
    startBgm(SONG);
  } catch {
    // 鳴らせなくても遊びは壊さない
  }
}

/**
 * おとなモードの BGM トグルから呼ぶ。押下＝ユーザー操作なので on のときはその場で再開できる。
 * on:  設定を有効化して（ジェスチャ文脈なので）即再開。
 * off: 即フェード停止（0.5秒）。
 */
export function applyBgmSetting(on: boolean): void {
  ensureConfigured();
  try {
    if (on) {
      setBgmEnabled(true);
      startBgm(SONG);
    } else {
      setBgmEnabled(false);
      stopBgm(0.5);
    }
  } catch {
    // no-op 安全
  }
}
