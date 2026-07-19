// 同梱音声クリップの登録表（tier1 の素材）。
// VOICEVOX ENGINE（ずんだもん・あまあま）で事前生成した m4a を assets/voice/ に同梱し、ここで登録する。
// クレジット表記: VOICEVOX:ずんだもん（VOICEVOX 利用規約）。生成手順は assets/voice/README.md 参照。
//
// key = クリップ基名（voice.ts の PHRASE_VOICE の clip と一致）。共有音声ライブラリ（piyo-assets/voice）の
//   統一 id 規約: t_*＝タイトル読み / p_*＝ほめ・定型句 / e_*＝誤答フォロー（やわらか）。
// value = 再生可能な URL（require の戻り値）。
//
// 登録した基名は clips.ts が tier1 として最優先で再生する（呼び出し側の変更は不要）。
// 定型フレーズ（せいかい／タイトル／おしい／あれれ／ぜんぶできたね）はすべて tier1 クリップを同梱済み。
// 未登録の基名は voice.ts が自動で tier2（speechSynthesis）へフォールバックする。
// 外部送信ゼロ: クリップは端末内の同梱アセット。ネットワークは使わない。

// key = クリップ基名, value = 再生可能な URL（require の戻り値）。
// 存在しないファイルを require するとビルドが壊れるので、クリップを置いてから登録する。
export const CLIP_URLS: Record<string, string> = {
  // ── 定型句・タイトル・誤答フォロー（VOICEVOX:ずんだもん）──
  p_seikai: require('../../assets/voice/p_seikai.m4a'), // せいかい！（正解時）
  t_sansu: require('../../assets/voice/t_sansu.m4a'), // ぴよぴよさんすう（タイトル）
  e_oshii: require('../../assets/voice/e_oshii.m4a'), // おしい！（誤答フォロー）
  e_arere: require('../../assets/voice/e_arere.m4a'), // あれれ？（誤答フォロー）
  p_zenbu: require('../../assets/voice/p_zenbu.m4a'), // ぜんぶ できたね！（がんばりカード）
};

// 指定した基名のクリップが登録済みか。
export function hasClip(name: string | undefined): boolean {
  if (!name) return false;
  return Object.prototype.hasOwnProperty.call(CLIP_URLS, name) && !!CLIP_URLS[name];
}
