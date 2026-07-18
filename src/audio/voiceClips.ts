// 同梱音声クリップの登録表（tier1 の素材）。
// VOICEVOX ENGINE（ずんだもん・あまあま）で事前生成した m4a を assets/voice/ に同梱し、ここで登録する。
// クレジット表記: VOICEVOX:ずんだもん（VOICEVOX 利用規約）。生成手順は assets/voice/README.md 参照。
//
// key = クリップ基名（voice.ts の PHRASE_VOICE と一致）。
//   定型句: 'p_' + キー。例 'p_seikai'（せいかい！）
// value = 再生可能な URL（require の戻り値）。
//
// 登録した基名は clips.ts が tier1 として最優先で再生する（呼び出し側の変更は不要）。
// 未登録の基名（p_title / p_oshii / p_arere / p_dekita）は voice.ts が自動で tier2（speechSynthesis）へ
// フォールバックする。後で VOICEVOX クリップを assets/voice/ に置き、ここへ require を1行足すだけで tier1 化できる。
// 外部送信ゼロ: クリップは端末内の同梱アセット。ネットワークは使わない。

// key = クリップ基名, value = 再生可能な URL（require の戻り値）。
// 存在しないファイルを require するとビルドが壊れるので、クリップを置いてから登録する。
export const CLIP_URLS: Record<string, string> = {
  // ── 定型句（VOICEVOX:ずんだもん）──
  p_seikai: require('../../assets/voice/p_seikai.m4a'), // せいかい！（正解時）
};

// 指定した基名のクリップが登録済みか。
export function hasClip(name: string | undefined): boolean {
  if (!name) return false;
  return Object.prototype.hasOwnProperty.call(CLIP_URLS, name) && !!CLIP_URLS[name];
}
