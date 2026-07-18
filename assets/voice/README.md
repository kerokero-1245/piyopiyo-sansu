# assets/voice — 同梱音声クリップ

よみあげ（DESIGN §4）の3段構え「①同梱クリップ → ②speechSynthesis → ③無音」の、**①クリップ**を置く場所。
**VOICEVOX** により事前生成した日本語音声（`.m4a`）を同梱する。

**同梱済み（1個）**: 定型句「せいかい！」（`p_seikai.m4a`）。正解時に tier1 として最優先で再生される。

その他の読み上げ（タイトル「ぴよぴよさんすう」・誤答「おしい／あれれ」・がんばりカード「ぜんぶ できたね！」）は
まだクリップを同梱しておらず、② speechSynthesis（ja-JP）で読む。クリップが無い／未対応の環境でも、絵とアニメだけで
ゲームは完全に成立する（読み上げは「あると嬉しい」補助）。

## クレジット表記

**VOICEVOX:ずんだもん**（VOICEVOX 利用規約に基づく）。おとなモード画面の下部にも小さく表示している。

## 生成の再現情報（他アプリ・街と統一）

| 項目 | 値 |
|---|---|
| エンジン | VOICEVOX ENGINE 0.25.2（macOS x64 CPU・公式GitHubリリース） |
| 話者 / スタイル | ずんだもん / あまあま（`speaker` = style id **1**） |
| 速度 | `speedScale` = 0.95（`p_seikai`） |
| その他パラメータ | `audio_query` の既定値（pitch/intonation 等は変更なし） |
| 音声形式 | 24kHz モノラル WAV → `afconvert -f m4af -d aac -b 64000`（AAC 64kbps モノラル m4a） |

`p_seikai.m4a` は ぴよぴよことば と同一のクリップ（同じ「せいかい！」）を流用している。
生成手順（要約）: 公式リリースの ENGINE をローカル起動（HTTP API `localhost:50021`）→ `/audio_query` でクエリを作り
`speedScale` を調整 → `/synthesis` で WAV を得る → `afconvert` で m4a 化 → 本ディレクトリへ配置。
エンジンは生成後に停止し、音声は端末内同梱アセットとして扱う（**外部送信ゼロ**）。

## ファイル名の規約（基名）

| 対象 | 基名 | 例 | フォールバック読み上げ |
|---|---|---|---|
| 定型フレーズ | `PHRASE_VOICE` の基名（`src/audio/voice.ts`） | `p_seikai.m4a` | `せいかい` |

対応表（クリップ基名 → 意味）は `src/audio/voice.ts` の `PHRASE_VOICE` が正典。
`seikai`→`p_seikai` / `title`→`p_title` / `oshii`→`p_oshii` / `arere`→`p_arere` / `dekita`→`p_dekita`。

## クリップを追加する手順（後工程）

1. VOICEVOX で生成した音声をこのディレクトリに置く（ファイル基名＝上記の規約に一致させる）。
   例: `p_title.m4a`（ぴよぴよさんすう）/ `p_oshii.m4a`（おしい）/ `p_arere.m4a`（あれれ）/ `p_dekita.m4a`（ぜんぶ できたね）。
2. web ビルドにバンドルするため、`src/audio/voiceClips.ts` の `CLIP_URLS` に `require()` で1行足す。例:

   ```ts
   export const CLIP_URLS: Record<string, string> = {
     p_seikai: require('../../assets/voice/p_seikai.m4a'),
     p_title: require('../../assets/voice/p_title.m4a'),
   };
   ```

   （存在しないファイルを `require` するとビルドが壊れるので、クリップを置いてから登録する）
3. 登録した基名は `src/audio/clips.ts` の解決ロジックが自動で拾い、tier1 として最優先で再生する。
   呼び出し側（画面）の変更は不要。

## メモ

- **外部送信ゼロ**: クリップは端末内の同梱アセット。ネットワークは使わない（WORLD §9）。
- **iOS Safari**: 音は最初のユーザー操作より前に鳴らせない。タイトルの「あそぶ」タップの `warmUpVoice()` で
  （クリップがあれば）muted で1つ触ってアンロックする。
