// もんだい画面（本体）。つづきもの（連鎖）出題：1セット5問＝ひとつづきのお話（DESIGN §15）。
// 流れ: （第1問だけ）グループが登場 → その場で増減アニメ（きたよ！/かえったよ）→ 変化が終わって
//        から 問い「ぜんぶで/のこりは なん◯?」＋3択 → 正解=数え上げ→紙吹雪→グループは残ったまま
//        次の増減 / 不正解=ぷるぷる→増減を再演→ゆっくり数え上げ→もう一度。5問おわると できたね!。
//
// レイアウト（おつかいめいろの教訓 / DESIGN §8）:
//   縦を「ヘッダー＋ステージ＋問い＋選択肢帯」で構成し、ステージを flex:1 で確保。
//   ステージの実測サイズ（onLayout）と「このお話で出る最大数 maxCount」からモノの大きさを算出し、
//   セット中は size を固定（持ち越したモノがガタつかない）。どの数でも可視領域を絶対にはみ出さない。
//   背の低い横向き（src/layout.ts の isCompactLandscape。例: 844x390・568x320）では、1列の並びだと
//   ステージが潰れるので、左に「ヘッダー＋ステージ」、右に「問い＋選択肢（縦に3つ）」を並べる。
//   どちらの並びでも要素の木（mainCol / sideCol）は同じにして、回転してもステージを作り直さない。

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Confetti } from "@kerokero-1245/piyo-assets/ui";
import { colors, font, radius, space } from "../theme";
import { generateStorySet } from "../game/problems";
import { sizingPlan } from "../game/grid";
import { FRAME_MAX_W_WIDE, isCompactLandscape } from "../layout";
import { addStars, getMaxSum, getTtsOn } from "../settings";
import { playSound } from "../audio/sounds";
import {
  cancelVoice,
  sayDelta,
  sayPhrase,
  sayWrongCheer,
} from "../audio/voice";
import { CharDef, Op, StorySet } from "../types";
import ThingsStage, { ThingsStageHandle } from "../components/ThingsStage";
import ChoiceButton from "../components/ChoiceButton";
import ClearOverlay from "../components/ClearOverlay";
import ProgressStar from "../components/ProgressStar";

interface Props {
  onHome: () => void;
}

const SET_SIZE = 5;
const GAP = 12;
const BADGE_RESERVE = 72; // ステージ内の数え上げバッジ帯のぶん
// 正解時「せいかい！」を先に鳴らし、その少しあとに数え上げ演出を始める（順序厳守）。
const SEIKAI_LEAD_MS = 600;

// 好ましい最小の一辺。ステージの内側（ふちから PREFERRED_EDGE 以上離して）に収まるときだけ、
// 見積もりがこれより小さくてもこの大きさにする（320x568 の 5まで は 38.4 → 40）。
// 収まらないとき（320x568 の 20まで の4段など）は見積もりのまま（下限 12）。以前の無条件の下限 40 は
// 4段ぶんの高さが足りず下の段をステージ外へ切っていた。
const PREFERRED_MIN = 40;
// 40 にするときの ステージのふちとの最小の間（枠線2＋数え上げのポップ 1.16 倍で絵がはみ出す分 約6 を含む）。
const PREFERRED_EDGE = space.sm;
// 背の低い横向きで右に置く「問い＋選択肢」の列の幅（枠の内側の幅に対する割合と上下限）。
const SIDE_RATIO = 0.37;
const SIDE_MIN_W = 196;
const SIDE_MAX_W = 320;
// 問いの文字数の見積もり（いちばん長い「のこりは なんびき?」= 10 字。1字 = 1em で保守的に）。
const QUESTION_EM = 10;

// モノの並び方（1行あたりの数と行数）は src/game/grid.ts に一本化（ThingsStage と共有）。
// 配置は gridPlan(n)、サイズ見積もりは sizingPlan(counts)（お話に出る数の最大列数で幅を確保）。

// 実測した残り領域に、お話に出る数（counts）がどれも収まるモノの1辺を求める（セット中は不変）。
// 下限は「収まること」を優先して小さく取る（12）。領域の下限は 0（以前の 80 は、背の低い横向きで
// 実際より広い領域を仮定してモノをステージ外へ出していた）。
function computeThingSize(
  w: number,
  h: number,
  counts: readonly number[],
): number {
  const { cols, rows } = sizingPlan(counts);
  const usableW = Math.max(w - space.md * 2, 0);
  const usableH = Math.max(h - BADGE_RESERVE - space.md, 0);
  const byW = (usableW - (cols - 1) * GAP) / cols;
  const byH = (usableH - (rows - 1) * GAP) / rows;
  const fit = Math.max(12, Math.min(byW, byH, 132));
  if (fit >= PREFERRED_MIN) return fit;
  const gridW = cols * PREFERRED_MIN + (cols - 1) * GAP;
  const gridH = rows * PREFERRED_MIN + (rows - 1) * GAP;
  const fitsPreferred =
    gridW <= w - PREFERRED_EDGE * 2 &&
    gridH <= h - BADGE_RESERVE - PREFERRED_EDGE * 2;
  return fitsPreferred ? PREFERRED_MIN : fit;
}

export default function PlayScreen({ onHome }: Props) {
  const maxSumRef = useRef<number>(getMaxSum());
  // 読み上げ設定はマウント時に固定（このセットの途中では変わらない）。
  const ttsRef = useRef<boolean>(getTtsOn());
  // 直前セットの主役（次セットで別種を選ぶための持ち回り）。
  const prevCharRef = useRef<CharDef | undefined>(undefined);
  const [story, setStory] = useState<StorySet>(() => {
    const s = generateStorySet(maxSumRef.current, SET_SIZE);
    prevCharRef.current = s.char;
    return s;
  });
  const [index, setIndex] = useState(0);
  const [gameId, setGameId] = useState(0);
  // このセットで集めた⭐スタンプの数（=クリアした問題数）。進捗ドットが左から⭐に変わる。
  const [starsEarned, setStarsEarned] = useState(0);

  const [measured, setMeasured] = useState({ w: 0, h: 0 });
  const [ready, setReady] = useState(false); // 増減アニメ後に回答可能
  const [locked, setLocked] = useState(false); // 数え上げ/祝福/デモのあいだは押せない
  const [wrongValue, setWrongValue] = useState(-1); // 直近にまちがえた値（震わせる対象）
  const [wrongNonce, setWrongNonce] = useState(0); // 単調増加（震えの再トリガ）
  const [celebrating, setCelebrating] = useState(false);
  const [done, setDone] = useState(false);

  const stageRef = useRef<ThingsStageHandle>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  }, []);
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      cancelVoice(); // 画面を離れるときは読み上げも止める
    },
    [],
  );

  const step = story.steps[index];
  // モノの大きさは「このお話で出る数」（最初の数と各問の答え）に合わせる（セット中は不変）。
  const counts = [story.initialCount, ...story.steps.map((s) => s.answer)];
  const size = computeThingSize(measured.w, measured.h, counts);

  // 背の低い横向きは左右の並び。右の列の幅と問いの文字の大きさは枠の内側の幅から決める。
  const { width: windowW, height: windowH } = useWindowDimensions();
  const side = isCompactLandscape(windowW, windowH);
  const frameInnerW = Math.min(windowW, FRAME_MAX_W_WIDE) - space.md * 2;
  const sideW = Math.round(
    Math.min(SIDE_MAX_W, Math.max(SIDE_MIN_W, frameInnerW * SIDE_RATIO)),
  );
  const sideQuestionFont = Math.min(
    font.title,
    Math.floor((sideW - space.xs) / QUESTION_EM),
  );
  // 選択肢のドット欄は「かずの おおきさ」で出うる最大値の行数（5個/行）ぶんを常に確保する。
  // 問題ごとの数でボタンの高さが変わると、flex:1 のステージが伸び縮みし、モノの大きさと
  // 置き場所がズレて下の段が切れる（20まで の 515x684 で実際に発生）。行数を固定して防ぐ。
  // 5まで=1行 / 10まで=2行 は従来の下限 34 に収まるので、見た目は1pxも変わらない。
  const choiceDotRows = Math.ceil(maxSumRef.current / 5);

  const onStageLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setMeasured((m) =>
      m.w === width && m.h === height ? m : { w: width, h: height },
    );
  };

  const handleReady = useCallback(() => {
    setReady(true);
    setLocked(false);
  }, []);

  // 増減が始まったら「きたよ！」（add）/「かえったよ」（sub）を鳴らす（読み上げオンのとき）。
  const handleDeltaStart = useCallback((op: Op) => {
    if (ttsRef.current) sayDelta(op, { enabled: true });
  }, []);

  const goNext = useCallback(() => {
    setWrongValue(-1);
    if (index + 1 >= story.steps.length) {
      setDone(true);
    } else {
      setReady(false);
      setLocked(false);
      setIndex(index + 1); // stepIndex が進む → 次の増減アニメが走る（グループは残ったまま）
    }
  }, [index, story.steps.length]);

  const newGame = useCallback(() => {
    const s = generateStorySet(
      maxSumRef.current,
      SET_SIZE,
      prevCharRef.current,
    );
    prevCharRef.current = s.char;
    setStory(s);
    setIndex(0);
    setGameId((g) => g + 1);
    setStarsEarned(0);
    setReady(false);
    setLocked(false);
    setCelebrating(false);
    setDone(false);
    setWrongValue(-1);
  }, []);

  const onChoice = useCallback(
    (value: number) => {
      if (!ready || locked || done) return;
      playSound("tap");
      if (value === step.answer) {
        // 正解: 「せいかい！」→ その後に 数え上げ → ⭐スタンプ獲得 → ちいさな紙吹雪 → 次へ（順序厳守）。
        // 再挑戦してからのクリアでも同じ⭐（獲得に条件差はつけない・DESIGN §14）。
        setReady(false);
        setLocked(true);
        const startCountUp = () =>
          stageRef.current?.countUp(() => {
            // ⭐を1つ獲得。累計にも加算し、進捗ドットを⭐へ（ぽんっと出る）。
            addStars(1);
            setStarsEarned((s) => s + 1);
            playSound("star");
            setCelebrating(true);
            later(() => {
              setCelebrating(false);
              goNext();
            }, 1100);
          }, false);
        if (ttsRef.current) {
          // まず「せいかい！」（tier1 クリップ → tier2 TTS）。少し先行させてから数え上げへ。
          sayPhrase("seikai", { enabled: true });
          later(startCountUp, SEIKAI_LEAD_MS);
        } else {
          startCountUp(); // 読み上げオフ: これまで通り即・数え上げ
        }
      } else {
        // 不正解: ぷるぷる（wiggle）と「おしい／あれれ」を同時に → 増減を再演 → ゆっくり数え上げ →
        // もう一度。罰なし（DESIGN §4）。
        setWrongValue(value);
        setWrongNonce((n) => n + 1);
        playSound("wrong");
        if (ttsRef.current) sayWrongCheer({ enabled: true });
        setReady(false);
        setLocked(true);
        stageRef.current?.replayDelta(() =>
          stageRef.current?.countUp(() => {
            stageRef.current?.reset();
            setLocked(false);
            setReady(true);
          }, true),
        );
      }
    },
    [ready, locked, done, step, goNext, later],
  );

  const choicesDisabled = !ready || locked || done;
  const phase = done
    ? "done"
    : celebrating
      ? "celebrate"
      : ready
        ? "ready"
        : locked
          ? "busy"
          : "anim";
  // 増減アニメ中（anim）は 問い・選択肢を見せない（経過を見ないと問いが始まらない・DESIGN §15）。
  // 高さは保ったまま opacity で隠すのでステージのサイズは動かない（モノがガタつかない・§8）。
  const revealed = phase !== "anim";

  return (
    <View style={[styles.root, side && styles.rootSide]}>
      {/* 左（縦持ちでは上）: ヘッダー＋ステージ */}
      <View style={styles.mainCol}>
        {/* ヘッダー: おうち＋進捗ドット */}
        <View style={styles.header}>
          <Pressable
            onPress={onHome}
            hitSlop={10}
            style={styles.homeBtn}
            accessibilityLabel="おうちへ"
          >
            <Text style={styles.homeGlyph}>🏠</Text>
          </Pressable>
          <View style={styles.progress} testID="progress">
            {story.steps.map((_, i) => (
              // クリア済み=⭐ / いまの問題=オレンジ丸 / これから=グレー丸
              <ProgressStar
                key={i}
                state={i < starsEarned ? "star" : i === index ? "now" : "off"}
              />
            ))}
          </View>
          <View style={styles.homeBtn} />
        </View>

        {/* ステージ: セット中は remount しない（key=gameId）。グループが問題をまたいで残る。 */}
        <View
          style={[styles.stage, side && styles.stageSide]}
          onLayout={onStageLayout}
        >
          {measured.w > 0 && measured.h > 0 ? (
            <ThingsStage
              key={gameId}
              ref={stageRef}
              char={story.char}
              initialCount={story.initialCount}
              step={step}
              stepIndex={index}
              maxCount={story.maxCount}
              size={size}
              gap={GAP}
              stageW={measured.w}
              stageH={measured.h}
              onReady={handleReady}
              onDeltaStart={handleDeltaStart}
            />
          ) : null}
        </View>
      </View>

      {/* 右（縦持ちでは下）: 問い＋選択肢 */}
      <View style={side ? [styles.sideCol, { width: sideW }] : null}>
        {/* 問い（増減アニメ中は隠す。高さは確保） */}
        <View
          style={[
            styles.questionBand,
            side && styles.questionBandSide,
            { opacity: revealed ? 1 : 0 },
          ]}
        >
          <Text
            style={[styles.question, side && { fontSize: sideQuestionFont }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {step.op === "add" ? "ぜんぶで " : "のこりは "}
            {story.char.ask}?
          </Text>
        </View>

        {/* 選択肢（●●●＋数字）。増減アニメ中は隠す（高さは確保）＋押せない。 */}
        <View
          style={[
            side ? styles.answersSide : styles.answers,
            { opacity: revealed ? 1 : 0 },
          ]}
          pointerEvents={revealed ? "auto" : "none"}
        >
          {step.choices.map((c) => (
            <ChoiceButton
              key={c}
              value={c}
              disabled={choicesDisabled}
              reserveRows={choiceDotRows}
              shakeNonce={wrongValue === c ? wrongNonce : 0}
              compact={side}
              onPress={() => onChoice(c)}
            />
          ))}
        </View>
      </View>

      {/* テスト用（不可視）: いまの局面と問題データ。持ち越し・出題順・アニメ完了を実測する足場。
          答えを含むので開発時（__DEV__）だけ出し、書き出した本番の DOM には残さない。 */}
      {__DEV__ ? (
        <>
          <Text testID="phase" style={styles.hidden}>
            {phase}
          </Text>
          <Text testID="step-info" style={styles.hidden}>
            {JSON.stringify({
              i: index,
              before: step.before,
              answer: step.answer,
              op: step.op,
              emoji: story.char.emoji,
              initial: story.initialCount,
              maxCount: story.maxCount,
            })}
          </Text>
        </>
      ) : null}

      {celebrating ? <Confetti /> : null}
      {done ? (
        <ClearOverlay starCount={SET_SIZE} onReplay={newGame} onHome={onHome} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  rootSide: {
    flexDirection: "row",
    columnGap: space.sm,
  },
  // 縦持ちでは ヘッダー＋ステージ（flex:1）の入れ物。中身の並び・大きさは従来と同じ。
  mainCol: {
    flex: 1,
  },
  // 背の低い横向きの右の列（問い＋選択肢）。幅は sideW。
  sideCol: {
    justifyContent: "center",
  },
  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  homeBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  homeGlyph: {
    fontSize: 28,
  },
  progress: {
    flexDirection: "row",
    columnGap: space.sm,
    alignItems: "center",
  },
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.stageBg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.stageBorder,
    marginVertical: space.sm,
    overflow: "hidden",
  },
  stageSide: {
    marginTop: space.xs,
    marginBottom: 0,
  },
  questionBand: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.sm,
  },
  questionBandSide: {
    minHeight: 32,
    marginBottom: space.xs,
  },
  question: {
    fontSize: font.title,
    fontWeight: "900",
    color: colors.text,
  },
  answers: {
    flexDirection: "row",
    columnGap: space.sm,
    paddingBottom: space.sm,
  },
  // 背の低い横向き: 選択肢を縦に3つ積み、残りの高さを3等分する（ChoiceButton の compact）。
  answersSide: {
    flex: 1,
    rowGap: space.xs,
  },
  hidden: {
    position: "absolute",
    left: 0,
    top: 0,
    fontSize: 1,
    opacity: 0,
  },
});
