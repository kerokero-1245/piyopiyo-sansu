// もんだい画面（本体）。つづきもの（連鎖）出題：1セット5問＝ひとつづきのお話（DESIGN §15）。
// 流れ: （第1問だけ）グループが登場 → その場で増減アニメ（きたよ！/かえったよ）→ 変化が終わって
//        から 問い「ぜんぶで/のこりは なん◯?」＋3択 → 正解=数え上げ→紙吹雪→グループは残ったまま
//        次の増減 / 不正解=ぷるぷる→増減を再演→ゆっくり数え上げ→もう一度。5問おわると できたね!。
//
// レイアウト（おつかいめいろの教訓 / DESIGN §8）:
//   縦を「ヘッダー＋ステージ＋問い＋選択肢帯」で構成し、ステージを flex:1 で確保。
//   ステージの実測サイズ（onLayout）と「このお話で出る最大数 maxCount」からモノの大きさを算出し、
//   セット中は size を固定（持ち越したモノがガタつかない）。どの数でも可視領域を絶対にはみ出さない。

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, space } from '../theme';
import { generateStorySet } from '../game/problems';
import { addStars, getMaxSum, getTtsOn } from '../settings';
import { playSound } from '../audio/sounds';
import { cancelVoice, sayDelta, sayPhrase, sayWrongCheer } from '../audio/voice';
import { CharDef, Op, StorySet } from '../types';
import ThingsStage, { ThingsStageHandle } from '../components/ThingsStage';
import ChoiceButton from '../components/ChoiceButton';
import ClearOverlay from '../components/ClearOverlay';
import Confetti from '../components/Confetti';
import ProgressStar from '../components/ProgressStar';

interface Props {
  onHome: () => void;
}

const SET_SIZE = 5;
const GAP = 12;
const BADGE_RESERVE = 72; // ステージ内の数え上げバッジ帯のぶん
// 正解時「せいかい！」を先に鳴らし、その少しあとに数え上げ演出を始める（順序厳守）。
const SEIKAI_LEAD_MS = 600;

// モノの並び方（1行あたりの数と行数）。5以下は1行、6以上は2行に均等割り。
function gridPlan(renderCount: number): { cols: number; rows: number } {
  if (renderCount <= 5) return { cols: Math.max(1, renderCount), rows: 1 };
  const cols = Math.ceil(renderCount / 2);
  return { cols, rows: 2 };
}

// 実測した残り領域に、maxCount 個が収まるモノの1辺を求める（セット中は不変）。
function computeThingSize(w: number, h: number, renderCount: number): number {
  const { cols, rows } = gridPlan(renderCount);
  const usableW = Math.max(w - space.md * 2, 80);
  const usableH = Math.max(h - BADGE_RESERVE - space.md, 80);
  const byW = (usableW - (cols - 1) * GAP) / cols;
  const byH = (usableH - (rows - 1) * GAP) / rows;
  return Math.max(40, Math.min(byW, byH, 132));
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
    []
  );

  const step = story.steps[index];
  // モノの大きさは「このお話で出る最大数」に合わせる（セット中は不変）。
  const size = computeThingSize(measured.w, measured.h, story.maxCount);

  const onStageLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setMeasured((m) => (m.w === width && m.h === height ? m : { w: width, h: height }));
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
    const s = generateStorySet(maxSumRef.current, SET_SIZE, prevCharRef.current);
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
      playSound('tap');
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
            playSound('star');
            setCelebrating(true);
            later(() => {
              setCelebrating(false);
              goNext();
            }, 1100);
          }, false);
        if (ttsRef.current) {
          // まず「せいかい！」（tier1 クリップ → tier2 TTS）。少し先行させてから数え上げへ。
          sayPhrase('seikai', { enabled: true });
          later(startCountUp, SEIKAI_LEAD_MS);
        } else {
          startCountUp(); // 読み上げオフ: これまで通り即・数え上げ
        }
      } else {
        // 不正解: ぷるぷる（wiggle）と「おしい／あれれ」を同時に → 増減を再演 → ゆっくり数え上げ →
        // もう一度。罰なし（DESIGN §4）。
        setWrongValue(value);
        setWrongNonce((n) => n + 1);
        playSound('wrong');
        if (ttsRef.current) sayWrongCheer({ enabled: true });
        setReady(false);
        setLocked(true);
        stageRef.current?.replayDelta(() =>
          stageRef.current?.countUp(() => {
            stageRef.current?.reset();
            setLocked(false);
            setReady(true);
          }, true)
        );
      }
    },
    [ready, locked, done, step, goNext, later]
  );

  const choicesDisabled = !ready || locked || done;
  const phase = done
    ? 'done'
    : celebrating
      ? 'celebrate'
      : ready
        ? 'ready'
        : locked
          ? 'busy'
          : 'anim';
  // 増減アニメ中（anim）は 問い・選択肢を見せない（経過を見ないと問いが始まらない・DESIGN §15）。
  // 高さは保ったまま opacity で隠すのでステージのサイズは動かない（モノがガタつかない・§8）。
  const revealed = phase !== 'anim';

  return (
    <View style={styles.root}>
      {/* ヘッダー: おうち＋進捗ドット */}
      <View style={styles.header}>
        <Pressable onPress={onHome} hitSlop={10} style={styles.homeBtn} accessibilityLabel="おうちへ">
          <Text style={styles.homeGlyph}>🏠</Text>
        </Pressable>
        <View style={styles.progress} testID="progress">
          {story.steps.map((_, i) => (
            // クリア済み=⭐ / いまの問題=オレンジ丸 / これから=グレー丸
            <ProgressStar key={i} state={i < starsEarned ? 'star' : i === index ? 'now' : 'off'} />
          ))}
        </View>
        <View style={styles.homeBtn} />
      </View>

      {/* ステージ: セット中は remount しない（key=gameId）。グループが問題をまたいで残る。 */}
      <View style={styles.stage} onLayout={onStageLayout}>
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

      {/* 問い（増減アニメ中は隠す。高さは確保） */}
      <View style={[styles.questionBand, { opacity: revealed ? 1 : 0 }]}>
        <Text style={styles.question} numberOfLines={1} adjustsFontSizeToFit>
          {step.op === 'add' ? 'ぜんぶで ' : 'のこりは '}
          {story.char.ask}?
        </Text>
      </View>

      {/* 選択肢（●●●＋数字）。増減アニメ中は隠す（高さは確保）＋押せない。 */}
      <View style={[styles.answers, { opacity: revealed ? 1 : 0 }]} pointerEvents={revealed ? 'auto' : 'none'}>
        {step.choices.map((c) => (
          <ChoiceButton
            key={c}
            value={c}
            disabled={choicesDisabled}
            shakeNonce={wrongValue === c ? wrongNonce : 0}
            onPress={() => onChoice(c)}
          />
        ))}
      </View>

      {/* テスト用（不可視）: いまの局面と問題データ。持ち越し・出題順・アニメ完了を実測する足場。 */}
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

      {celebrating ? <Confetti /> : null}
      {done ? <ClearOverlay starCount={SET_SIZE} onReplay={newGame} onHome={onHome} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  homeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeGlyph: {
    fontSize: 28,
  },
  progress: {
    flexDirection: 'row',
    columnGap: space.sm,
    alignItems: 'center',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.stageBg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.stageBorder,
    marginVertical: space.sm,
    overflow: 'hidden',
  },
  questionBand: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  question: {
    fontSize: font.title,
    fontWeight: '900',
    color: colors.text,
  },
  answers: {
    flexDirection: 'row',
    columnGap: space.sm,
    paddingBottom: space.sm,
  },
  hidden: {
    position: 'absolute',
    left: 0,
    top: 0,
    fontSize: 1,
    opacity: 0,
  },
});
