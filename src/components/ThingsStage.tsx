// もんだいのステージ。モノ（絵文字）が増える/減るアニメを見せ、正解/不正解のあとに
// 1つずつハイライトしながら「1…2…3!」と数え上げる（DESIGN §5・§7）。
// アニメは React Native 標準 Animated のみ。1問ごとに親が key を変えて作り直す前提。
//
// レイアウトの約束（おつかいめいろの教訓 / DESIGN §8）:
//   モノの1辺 size と1行の数 cols は「実測した残り領域」から親が算出して渡す。
//   本コンポーネントはその size で並べるだけなので、可視領域を絶対にはみ出さない。

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors, font } from '../theme';
import { Problem } from '../types';
import { playCountTone, playSound } from '../audio/sounds';

export interface ThingsStageHandle {
  // present なモノ（add: 総数 / sub: 残り）を 1..answer まで順に数え上げる。slow=不正解後のゆっくり提示。
  countUp: (onDone: () => void, slow: boolean) => void;
  // ハイライトと数字表示を消す（不正解後の再挑戦前に呼ぶ）。
  reset: () => void;
}

interface Props {
  problem: Problem;
  size: number; // モノ1つの1辺
  cols: number; // 1行に並べる数
  gap: number; // モノの間隔
  onReady?: () => void; // 増減アニメが終わって回答可能になった
}

const ThingsStage = forwardRef<ThingsStageHandle, Props>(function ThingsStage(
  { problem, size, cols, gap, onReady },
  ref
) {
  const { op, a, answer } = problem;
  // 描画するスロット数: たしざんは総数、ひきざんは最初の数。
  const renderCount = op === 'add' ? answer : a;

  // enter: 各モノの登場/退場（0..1）。pop: 数え上げハイライト（0..1）。
  // 1問ごとに remount される想定なので、初期値はマウント時に一度だけ決める。
  const enterRef = useRef<Animated.Value[]>([]);
  const popRef = useRef<Animated.Value[]>([]);
  if (enterRef.current.length !== renderCount) {
    enterRef.current = Array.from(
      { length: renderCount },
      // add: 最初の a 個は最初から居る(1)、増える b 個は隠れて(0)から歩いてくる。
      // sub: すべて最初から居る(1)。あとで食べられる b 個が 0 へ抜ける。
      (_, i) => new Animated.Value(op === 'add' ? (i < a ? 1 : 0) : 1)
    );
    popRef.current = Array.from({ length: renderCount }, () => new Animated.Value(0));
  }
  const enter = enterRef.current;
  const pop = popRef.current;

  const [count, setCount] = useState<number | null>(null);

  // タイマーはまとめて破棄できるようにしておく。
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  };
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    []
  );

  // 増減アニメ（登場/退場）→ 終わったら onReady。マウント時に一度だけ。
  useEffect(() => {
    const changing: number[] = [];
    if (op === 'add') {
      for (let i = a; i < answer; i++) changing.push(i); // 歩いてくる b 個
    } else {
      for (let i = answer; i < a; i++) changing.push(i); // 食べられる b 個（末尾）
    }
    if (changing.length === 0) {
      onReady?.();
      return;
    }
    const stepMs = 380;
    const startDelay = op === 'add' ? 550 : 650;
    later(() => {
      changing.forEach((i, k) => {
        later(() => {
          if (op === 'add') {
            playSound('appear');
            Animated.spring(enter[i], {
              toValue: 1,
              friction: 5,
              tension: 80,
              useNativeDriver: false,
            }).start();
          } else {
            playSound('eat');
            Animated.timing(enter[i], {
              toValue: 0,
              duration: 360,
              easing: Easing.in(Easing.quad),
              useNativeDriver: false,
            }).start();
          }
        }, k * stepMs);
      });
      later(() => onReady?.(), changing.length * stepMs + 350);
    }, startDelay);
    // マウント時のみ実行（問題ごとに remount される）。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    countUp(onDone, slow) {
      pop.forEach((v) => v.setValue(0));
      const stepMs = slow ? 680 : 440;
      const step = (i: number) => {
        if (i >= answer) {
          setCount(answer);
          later(onDone, slow ? 550 : 400);
          return;
        }
        setCount(i + 1);
        playCountTone(i);
        Animated.spring(pop[i], {
          toValue: 1,
          friction: 4,
          tension: 130,
          useNativeDriver: false,
        }).start();
        later(() => step(i + 1), stepMs);
      };
      step(0);
    },
    reset() {
      pop.forEach((v) => v.setValue(0));
      setCount(null);
    },
  }));

  const rowWidth = cols * size + (cols - 1) * gap;

  return (
    <View style={styles.wrap}>
      {/* 数え上げの大きな数字（1→2→3）。ステージ上部に浮かせる。 */}
      <View style={styles.badgeSlot} pointerEvents="none">
        {count !== null ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.grid, { width: rowWidth, columnGap: gap, rowGap: gap }]}>
        {enter.map((e, i) => {
          const isEaten = op === 'sub' && i >= answer;
          const isIncoming = op === 'add' && i >= a;
          const scaleEnter = e.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
          const popScale = pop[i].interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] });
          const scale = Animated.multiply(scaleEnter, popScale);
          const translateX = isIncoming
            ? e.interpolate({ inputRange: [0, 1], outputRange: [size * 1.1, 0] })
            : 0;
          const translateY = isEaten
            ? e.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.5, 0] })
            : 0;
          return (
            <View key={i} style={{ width: size, height: size }}>
              {/* 数えたときにともる やわらかい光 */}
              <Animated.View
                style={[
                  styles.halo,
                  {
                    borderRadius: size,
                    opacity: pop[i],
                    transform: [{ scale: pop[i].interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
                  },
                ]}
              />
              <Animated.Text
                style={[
                  styles.thing,
                  {
                    fontSize: size * 0.72,
                    lineHeight: size,
                    opacity: e,
                    transform: [{ scale }, { translateX }, { translateY }],
                  },
                ]}
              >
                {problem.char.emoji}
              </Animated.Text>
            </View>
          );
        })}
      </View>
    </View>
  );
});

export default ThingsStage;

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSlot: {
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.countBadge,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.white,
    shadowColor: '#00000055',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  badgeText: {
    fontSize: font.title,
    fontWeight: '900',
    color: colors.white,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    alignContent: 'center',
  },
  halo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.countHalo,
    borderWidth: 3,
    borderColor: colors.countRing,
  },
  thing: {
    textAlign: 'center',
  },
});