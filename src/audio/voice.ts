// 読み上げの入口（DESIGN §4）。画面はこのモジュールだけを呼ぶ。内部で3段構えに解決する:
//   ① 同梱クリップ（tier1 / clips.ts）… VOICEVOX 事前生成の音声。あれば最優先で再生。
//   ② speechSynthesis（tier2 / speech.ts）… ブラウザ内蔵の日本語合成音声（ja-JP）。
//   ③ 無音（tier3）… どちらも無ければ何もしない。絵とアニメだけでゲームは成立する。
//
// 定型フレーズ（せいかい・タイトル・おしい・あれれ・ぜんぶできたね）はすべて同梱クリップを登録済みで
// tier1 で鳴る（voiceClips.CLIP_URLS）。クリップ未同梱／非対応の環境だけ tier2（speechSynthesis）へ落ちる。
// 呼び出し側は clip の有無を意識せず sayPhrase()／sayWrongCheer() を呼ぶだけでよい。
//
// iOS Safari の自動再生制限（最初のユーザー操作より前に音を出せない）は warmUpVoice() で守る。

import { isClipAvailable, playClip, warmUpClips, cancelClip } from './clips';
import { CLIP_URLS } from './voiceClips';
import { speak, warmUpSpeech, cancelSpeech, isSpeechAvailable } from './speech';
import { duckBgm, unduckBgm } from './bgm/engine';
import { Op } from '../types';

// 読み上げ1回ぶんの指定。clip=同梱クリップの基名（無ければ tier2 へ）/ text=フォールバック読み上げ文字列。
export interface VoiceSpec {
  clip?: string; // 同梱クリップ基名（voiceClips のキー）。あれば tier1 で再生。
  text: string; // tier2（speechSynthesis）で読む文字列（ひらがな）。
}

// ── 定型フレーズ（クリップ基名の対応表）─────────────────────────────────
// seikai … 正解の「せいかい！」（同梱クリップ p_seikai を最優先で再生 → その後に数え上げ）。
// title  … タイトルの「ぴよぴよさんすう」（タップ起点で読む）。
// oshii / arere … 誤答タップのやさしい声かけ（否定語なし・責めない・WORLD 正典）。
// dekita … がんばりカードの「ぜんぶ できたね！」（5つ揃った祝福）。
// kitayo / kaettayo … つづきもの出題の増減の合図（add=1匹きたよ！/ sub=1匹かえったよ・DESIGN §15）。
//   同梱クリップ p_kitayo / p_kaettayo があれば tier1、無ければ tier2（TTS）が text を読む。
export type PhraseKey = 'seikai' | 'title' | 'oshii' | 'arere' | 'dekita' | 'kitayo' | 'kaettayo';
export const PHRASE_VOICE: Record<PhraseKey, VoiceSpec> = {
  seikai: { clip: 'p_seikai', text: 'せいかい' },
  title: { clip: 't_sansu', text: 'ぴよぴよさんすう' },
  oshii: { clip: 'e_oshii', text: 'おしい' },
  arere: { clip: 'e_arere', text: 'あれれ' },
  dekita: { clip: 'p_zenbu', text: 'ぜんぶ できたね' },
  kitayo: { clip: 'p_kitayo', text: 'きたよ' },
  kaettayo: { clip: 'p_kaettayo', text: 'かえったよ' },
};

// 誤答タップの声かけを「おしい」→「あれれ」で交互に返すローテ（呼ぶたび1つ進む）。
// どちらも やさしい相づち。否定語・失敗表示はしない（罰なし・DESIGN §4 / WORLD 正典）。
const WRONG_CHEERS: PhraseKey[] = ['oshii', 'arere'];
let wrongCheerIdx = 0;

// 声の再生中だけ BGM を控えめに下げる（ダッキング）。開始で沈め、終了（自然終了 / エラー /
// 差し替え / 停止）で戻す。engine 側の duck はネスト対応（カウンタ）なので、声が重なっても
// 過不足なく元の音量へ戻る。返す解除関数は1回だけ有効（二重解除しても engine 側で無害）。
function beginDuck(): () => void {
  duckBgm();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    unduckBgm();
  };
}

// ── 再生（3段構えの解決）─────────────────────────────────────────────
// enabled=false（おとなモードで読み上げオフ）なら何もしない。
// 実際に声が鳴る tier だけ BgM をダッキングし、その声が終わったら戻す（効果音はダッキングしない）。
export function playVoice(spec: VoiceSpec, opts?: { enabled?: boolean }): void {
  if (opts && opts.enabled === false) return;
  // ① 同梱クリップ（tier1）
  if (isClipAvailable(spec.clip)) {
    const done = beginDuck();
    if (playClip(spec.clip as string, done)) return;
    done(); // 予期せず鳴らせなかったら、下げた音量を戻す
  }
  // ② speechSynthesis（tier2）
  if (isSpeechAvailable()) {
    const done = beginDuck();
    if (speak(spec.text, { enabled: true, onEnd: done })) return;
    done();
  }
  // ③ 無音（tier3）… 何もしない（ダッキングもしない）
}

// 定型フレーズを読む（せいかい／タイトル／ぜんぶできたね など）。
export function sayPhrase(key: PhraseKey, opts?: { enabled?: boolean }): void {
  playVoice(PHRASE_VOICE[key], opts);
}

// つづきもの出題の増減の合図。add=「きたよ！」/ sub=「かえったよ」。3段構えは playVoice にまかせる。
// enabled=false（読み上げオフ）なら何もしない（＝ 効果音＋アニメだけ）。
export function sayDelta(op: Op, opts?: { enabled?: boolean }): void {
  playVoice(PHRASE_VOICE[op === 'add' ? 'kitayo' : 'kaettayo'], opts);
}

// 誤答タップのやさしい声かけ。呼ぶたびに「おしい」「あれれ」を交互に読む。
// enabled=false（読み上げオフ）なら何もしない（＝ 効果音＋ぷるぷるだけ）。3段構えは playVoice にまかせる。
export function sayWrongCheer(opts?: { enabled?: boolean }): void {
  const key = WRONG_CHEERS[wrongCheerIdx % WRONG_CHEERS.length];
  wrongCheerIdx += 1;
  playVoice(PHRASE_VOICE[key], opts);
}

// 「あそぶ」タップ（＝最初のジェスチャ）で1回呼ぶ。tier1（クリップ）と tier2（TTS）両方をアンロックする。
export function warmUpVoice(): void {
  warmUpClips();
  warmUpSpeech();
}

// 発声を止める（画面を離れるとき・次の発声の前）。両 tier を止める。
export function cancelVoice(): void {
  cancelClip();
  cancelSpeech();
}

// 読み上げが1つでも使えるか（同梱クリップが1つでもある or TTS が使える）。
// 両方無い環境のみ false ＝ 絵とアニメだけで成立（tier3）。
export function isVoiceAvailable(): boolean {
  const anyClip = Object.keys(CLIP_URLS).some((name) => isClipAvailable(name));
  return anyClip || isSpeechAvailable();
}
