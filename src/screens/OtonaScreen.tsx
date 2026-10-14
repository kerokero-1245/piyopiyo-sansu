// おとなモード（親ゲートの奥）。かずの おおきさ（合計5まで / 10まで / 20まで）の切替と、
// あつめた ほし（累計⭐）の表示・リセット（DESIGN §7・§14）。
// 変更は次のもんだいから反映される（PlayScreen がマウント時に設定を読む）。
// 項目が増えても背の低い画面で「もどる」が隠れないよう、内容は ScrollView に入れる（DESIGN §8）。
// 選択肢の文字は枠の幅から大きさを決め、✓ は文字の横ではなく右上に重ねて、狭い画面でも1行に収める。
// 「0に もどす」は さんすうの中の表示だけを 0 にする。街へ渡す累計 sansu.totalStars は残す（settings.ts）。

import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { BigButton } from "@kerokero-1245/piyo-assets/ui";
import { colors, font, radius, space } from "../theme";
import {
  getBgmOn,
  getMaxSum,
  getShownStars,
  getTtsOn,
  MaxSum,
  resetShownStars,
  setBgmOn,
  setMaxSum,
  setTtsOn,
} from "../settings";
import { playSound } from "../audio/sounds";
import { applyBgmSetting } from "../audio/bgm";

interface Props {
  onBack: () => void;
}

const CARD_PAD = space.md; // カードの内側の余白
const OPTION_GAP = space.sm; // 選択肢どうしの間
const OPTION_PAD = 4; // 選択肢の内側の左右の余白

// 3つ並びの選択肢（いちばん長い「10まで」= 4字）が1行に収まる文字の大きさ。
// 1字 = 1em で見積もる（保守的）。Mac のヒラギノの UI 用書体はかなが約 0.92em と狭いが、
// かなが全角（1em）の書体（Android の Noto Sans CJK JP など）でも折り返さないよう、狭い方には寄せない。
// 枠（最大幅 480・左右 space.md）→ カード（枠線1・余白 CARD_PAD）→ 選択肢（枠線3・余白 OPTION_PAD）の内側の幅から決める。
// 2つ並びの最長「ながさない」（5字）は、2つ並びの内側の幅が3つ並びの 1.5 倍以上あるのでこの大きさで収まる。
const OPTION_EM = 4;
function optionFontSize(windowW: number): number {
  const frameW = Math.min(windowW, 480) - space.md * 2;
  const cardInner = frameW - CARD_PAD * 2 - 2;
  const optionInner = (cardInner - OPTION_GAP * 2) / 3 - 3 * 2 - OPTION_PAD * 2;
  return Math.min(font.big, Math.floor(optionInner / OPTION_EM));
}

export default function OtonaScreen({ onBack }: Props) {
  const { width: windowW } = useWindowDimensions();
  const optionFont = { fontSize: optionFontSize(windowW) };
  const [maxSum, setMax] = useState<MaxSum>(getMaxSum());
  const [stars, setStars] = useState<number>(getShownStars());
  const [tts, setTts] = useState<boolean>(getTtsOn()); // よみあげ する/しない
  const [bgm, setBgm] = useState<boolean>(getBgmOn()); // BGM ながす/ながさない
  const [confirmReset, setConfirmReset] = useState(false); // 誤操作防止の2段階確認

  const choose = (v: MaxSum) => {
    playSound("tap");
    setMaxSum(v);
    setMax(v);
  };

  const onToggleTts = (on: boolean) => {
    playSound("tap");
    setTtsOn(on);
    setTts(on);
  };

  // BGM ながす/ながさない。押下＝ユーザー操作なので、ON にしたらその場で再開できる。
  const onToggleBgm = (on: boolean) => {
    playSound("tap");
    setBgmOn(on); // localStorage（sansu.bgm）へ永続化
    setBgm(on);
    applyBgmSetting(on); // OFF=即フェード停止 / ON=このジェスチャで即再開
  };

  const onResetPress = () => {
    playSound("tap");
    if (!confirmReset) {
      setConfirmReset(true); // 1回目は確認へ
      return;
    }
    resetShownStars(); // 表示だけ 0 に。街へ渡す累計（sansu.totalStars）は残す
    setStars(0);
    setConfirmReset(false);
  };

  const Option = ({ v, label }: { v: MaxSum; label: string }) => {
    const active = maxSum === v;
    return (
      <Pressable
        onPress={() => choose(v)}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        style={[
          styles.option,
          active ? styles.optionActive : styles.optionIdle,
        ]}
      >
        <Text
          style={[
            styles.optionText,
            optionFont,
            active && styles.optionTextActive,
          ]}
        >
          {label}
        </Text>
        {active ? <Text style={styles.check}>✓</Text> : null}
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>おとなモード</Text>

        <View style={styles.card}>
          <Text style={styles.label}>かずの おおきさ</Text>
          <View style={styles.options}>
            {/* eslint-disable-next-line react-hooks/static-components -- Option は描画のたびに作り直されるが、状態を持たない。外へ出すと挙動に触れるので別の段で直す */}
            <Option v={5} label="5まで" />
            {/* eslint-disable-next-line react-hooks/static-components -- Option は描画のたびに作り直されるが、状態を持たない。外へ出すと挙動に触れるので別の段で直す */}
            <Option v={10} label="10まで" />
            {/* eslint-disable-next-line react-hooks/static-components -- Option は描画のたびに作り直されるが、状態を持たない。外へ出すと挙動に触れるので別の段で直す */}
            <Option v={20} label="20まで" />
          </View>
          <Text style={styles.note}>
            4さいは「5まで」がおすすめ。なれてきたら「10まで」「20まで」に。つぎのもんだいからかわります。
          </Text>
        </View>

        {/* よみあげ する/しない（せいかい！・おしい／あれれ・タイトル・がんばりカードの こえ） */}
        <View style={[styles.card, styles.cardGap]}>
          <Text style={styles.label}>よみあげ</Text>
          <View style={styles.options}>
            <Pressable
              onPress={() => onToggleTts(true)}
              accessibilityRole="button"
              accessibilityState={{ selected: tts }}
              style={[
                styles.option,
                tts ? styles.optionActive : styles.optionIdle,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  optionFont,
                  tts && styles.optionTextActive,
                ]}
              >
                する
              </Text>
              {tts ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
            <Pressable
              onPress={() => onToggleTts(false)}
              accessibilityRole="button"
              accessibilityState={{ selected: !tts }}
              style={[
                styles.option,
                !tts ? styles.optionActive : styles.optionIdle,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  optionFont,
                  !tts && styles.optionTextActive,
                ]}
              >
                しない
              </Text>
              {!tts ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
          </View>
          <Text style={styles.note}>
            「する」だと せいかい や こえかけを よみます。おとが つかえない
            ときも あそべます。
          </Text>
        </View>

        {/* BGM ながす/ながさない（ちいさな オルゴール風の おんがく）。よみあげとは別に切り替えられる。 */}
        <View style={[styles.card, styles.cardGap]}>
          <Text style={styles.label}>BGM（おんがく）</Text>
          <View style={styles.options}>
            <Pressable
              onPress={() => onToggleBgm(true)}
              accessibilityRole="button"
              accessibilityState={{ selected: bgm }}
              style={[
                styles.option,
                bgm ? styles.optionActive : styles.optionIdle,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  optionFont,
                  bgm && styles.optionTextActive,
                ]}
              >
                ながす
              </Text>
              {bgm ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
            <Pressable
              onPress={() => onToggleBgm(false)}
              accessibilityRole="button"
              accessibilityState={{ selected: !bgm }}
              style={[
                styles.option,
                !bgm ? styles.optionActive : styles.optionIdle,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  optionFont,
                  !bgm && styles.optionTextActive,
                ]}
              >
                ながさない
              </Text>
              {!bgm ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
          </View>
          <Text style={styles.note}>
            ちいさな おんがくが ながれます。しずかに あそびたい
            ときは「ながさない」に。
          </Text>
        </View>

        {/* あつめた ほし（累計スタンプ）。数字スコアではなく“集めた⭐の数”。リセットはここだけ。 */}
        <View style={[styles.card, styles.cardGap]}>
          <Text style={styles.label}>あつめた ほし</Text>
          <Text style={styles.starTotal}>⭐ × {stars}</Text>
          <View style={styles.resetRow}>
            {confirmReset ? (
              <Pressable
                onPress={() => {
                  playSound("tap");
                  setConfirmReset(false);
                }}
                accessibilityRole="button"
                style={[
                  styles.resetBtn,
                  styles.resetBtnGrow,
                  styles.resetCancel,
                ]}
              >
                <Text style={styles.resetCancelText}>やめる</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={onResetPress}
              accessibilityRole="button"
              disabled={stars === 0 && !confirmReset}
              style={[
                styles.resetBtn,
                confirmReset
                  ? [styles.resetBtnGrow, styles.resetConfirm]
                  : styles.resetIdle,
                stars === 0 && !confirmReset ? styles.resetDisabled : null,
              ]}
            >
              <Text
                style={
                  confirmReset ? styles.resetConfirmText : styles.resetIdleText
                }
              >
                {confirmReset ? "ほんとうに 0に する" : "0に もどす"}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.note}>
            あつめた ほし は へりません。ここでだけ 0に もどせます。0に
            しても、まち（ぴよぴよランド）の ⭐ は へりません。
          </Text>
        </View>

        {/* 音声クレジット（VOICEVOX 利用規約）。同梱の読み上げクリップの出所を小さく明記する。 */}
        <Text style={styles.credit}>よみあげのこえ: VOICEVOX:ずんだもん</Text>
      </ScrollView>

      {/* 「もどる」はスクロールの外に固定し、背の低い画面でも常に押せるようにする（DESIGN §8）。 */}
      <View style={styles.backWrap}>
        <BigButton
          emoji="◀️"
          label="もどる"
          onPress={onBack}
          color={colors.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: space.lg,
    paddingBottom: space.md,
  },
  backWrap: {
    marginTop: space.md,
  },
  title: {
    fontSize: font.title,
    fontWeight: "800",
    color: colors.text,
    marginBottom: space.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: CARD_PAD,
    borderWidth: 1,
    borderColor: colors.stageBorder,
  },
  cardGap: {
    marginTop: space.md,
  },
  label: {
    fontSize: font.body,
    fontWeight: "800",
    color: colors.text,
    marginBottom: space.md,
  },
  options: {
    flexDirection: "row",
    columnGap: OPTION_GAP,
  },
  option: {
    flex: 1,
    minHeight: 84,
    borderRadius: radius.md,
    borderWidth: 3,
    paddingHorizontal: OPTION_PAD,
    alignItems: "center",
    justifyContent: "center",
  },
  optionIdle: {
    backgroundColor: colors.surface,
    borderColor: colors.stageBorder,
  },
  optionActive: {
    backgroundColor: colors.play,
    borderColor: colors.playPressed,
  },
  optionTextActive: {
    color: colors.white,
  },
  check: {
    // 選択中の印。文字の横に並べると狭い画面で文字が折り返すので、右上に重ねる。
    position: "absolute",
    top: 2,
    right: 8,
    fontSize: font.small,
    color: colors.white,
    fontWeight: "900",
  },
  optionText: {
    fontWeight: "900",
    color: colors.text,
  },
  note: {
    fontSize: font.small,
    color: colors.subtext,
    marginTop: space.md,
    lineHeight: 24,
  },
  credit: {
    fontSize: font.small,
    color: colors.subtext,
    textAlign: "center",
    marginTop: space.lg,
  },
  starTotal: {
    fontSize: font.huge,
    fontWeight: "900",
    color: colors.text,
  },
  resetRow: {
    // 確認中は「やめる」「ほんとうに 0に する」が横に入りきらない幅で2段に折り返す（はみ出さない）。
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: space.sm,
    rowGap: space.sm,
    marginTop: space.md,
  },
  resetBtnGrow: {
    flexGrow: 1,
  },
  resetBtn: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  resetIdle: {
    backgroundColor: colors.surface,
    borderColor: colors.stageBorder,
  },
  resetIdleText: {
    fontSize: font.body,
    fontWeight: "800",
    color: colors.subtext,
  },
  resetConfirm: {
    backgroundColor: colors.button,
    borderColor: colors.buttonPressed,
  },
  resetConfirmText: {
    fontSize: font.body,
    fontWeight: "900",
    color: colors.white,
  },
  resetCancel: {
    backgroundColor: colors.surface,
    borderColor: colors.stageBorder,
  },
  resetCancelText: {
    fontSize: font.body,
    fontWeight: "800",
    color: colors.text,
  },
  resetDisabled: {
    opacity: 0.4,
  },
});
