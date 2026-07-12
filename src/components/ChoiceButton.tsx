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
}

// value 個のドットを最大5個/行で並べる。
function dotRows(value: number): number[][] {
  const perRow = 5;
  const rows: number[][] = [];
  for (let i = 0; i < value; i += perRow) {
    rows.push(Array.from({ length: Math.min(perRow, value - i) }, (_, k) => i + k));
  }
  return rows;
}

export default function ChoiceButton({ value, onPress, disabled, shakeNonce = 0 }: Props) {
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
        <View style={styles.dots}>
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
    rowGap: 5,
    minHeight: 34,
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