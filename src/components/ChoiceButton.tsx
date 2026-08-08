// 選択肢の巨大ボタン。数字だけでなく「●●●」（同じ数のドット）を必ず併記し、
// 数字が読めなくても“数”で選べるようにする（DESIGN §1・§4）。
// まちがえて押されたときは shakeNonce が変わり、ぷるぷる震える（罰ではない合図）。

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, space } from '../theme';

interface Props {
  value: number;
  onPress: () => void;
  disabled?: boolean;
  shakeNonce?: number; // 0 = 震えない。>0 に変わると1回震える。
  // ドット欄に確保する行数（＝「かずの おおきさ」で出うる最大値の行数）。
  // これを固定しないと、問題ごとに選択肢ボタンの高さが変わり → ステージが伸び縮みし →
  // モノの大きさと置き場所がズレて、下の段が切れる（DESIGN §8「可視領域を絶対にはみ出さない」）。
  reserveRows?: number;
}

const DOT = 13; // ドット1つの直径（styles.dot と一致させる）
const DOT_GAP = 5; // 行間（styles.dots の rowGap と一致させる）
const DOTS_MIN_H = 34; // 1〜2行のときの従来の下限（5まで/10まで の見た目を1pxも変えない）

// value 個のドットを最大5個/行で並べる。
function dotRows(value: number): number[][] {
  const perRow = 5;
  const rows: number[][] = [];
  for (let i = 0; i < value; i += perRow) {
    rows.push(Array.from({ length: Math.min(perRow, value - i) }, (_, k) => i + k));
  }
  return rows;
}

// rows 行を置くのに必要な高さ。1〜2行は従来の下限（34）に収まるので見た目は変わらない。
function dotsHeight(rows: number): number {
  const n = Math.max(1, rows);
  return Math.max(DOTS_MIN_H, n * DOT + (n - 1) * DOT_GAP);
}

export default function ChoiceButton({ value, onPress, disabled, shakeNonce = 0, reserveRows = 1 }: Props) {
  const shake = useRef(new Animated.Value(0)).current;
  const prevNonce = useRef(0);

  useEffect(() => {
    if (shakeNonce > 0 && shakeNonce !== prevNonce.current) {
      prevNonce.current = shakeNonce;
      shake.setValue(0);
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 60, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(shake, { toValue: -1, duration: 90, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(shake, { toValue: 1, duration: 90, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(shake, { toValue: -1, duration: 90, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(shake, { toValue: 0, duration: 60, easing: Easing.linear, useNativeDriver: false }),
      ]).start();
    }
  }, [shakeNonce, shake]);

  const translateX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] });

  return (
    <Animated.View style={[styles.outer, { transform: [{ translateX }] }]}>
      <Pressable
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${value}`}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: pressed ? colors.choicePressed : colors.choice },
          disabled && styles.disabled,
        ]}
      >
        <View style={[styles.dots, { minHeight: dotsHeight(reserveRows) }]}>
          {dotRows(value).map((row, r) => (
            <View key={r} style={styles.dotRow}>
              {row.map((k) => (
                <View key={k} style={styles.dot} />
              ))}
            </View>
          ))}
        </View>
        <Text style={styles.numeral}>{value}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
  },
  card: {
    minHeight: 128,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.choiceBorder,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: space.xs,
    shadowColor: '#00000040',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    elevation: 3,
  },
  disabled: {
    opacity: 0.55,
  },
  dots: {
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: DOT_GAP,
    // 実際の下限は reserveRows から算出して上書きする（dotsHeight）。
    minHeight: DOTS_MIN_H,
  },
  dotRow: {
    flexDirection: 'row',
    columnGap: 5,
  },
  dot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.dot,
    borderWidth: 1.5,
    borderColor: colors.dotBorder,
  },
  numeral: {
    fontSize: font.huge,
    fontWeight: '900',
    color: colors.text,
    lineHeight: font.huge + 2,
  },
});