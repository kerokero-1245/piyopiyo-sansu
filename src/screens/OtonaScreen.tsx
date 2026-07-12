// おとなモード（親ゲートの奥）。かずの おおきさ（合計5まで / 10まで）を切り替える。
// 変更は次のもんだいから反映される（PlayScreen がマウント時に設定を読む / DESIGN §7）。

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, space } from '../theme';
import BigButton from '../components/BigButton';
import { getMaxSum, MaxSum, setMaxSum } from '../settings';
import { playSound } from '../audio/sounds';

interface Props {
  onBack: () => void;
}

export default function OtonaScreen({ onBack }: Props) {
  const [maxSum, setMax] = useState<MaxSum>(getMaxSum());

  const choose = (v: MaxSum) => {
    playSound('tap');
    setMaxSum(v);
    setMax(v);
  };

  const Option = ({ v, label }: { v: MaxSum; label: string }) => {
    const active = maxSum === v;
    return (
      <Pressable
        onPress={() => choose(v)}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        style={[styles.option, active ? styles.optionActive : styles.optionIdle]}
      >
        <Text style={[styles.optionText, active && styles.optionTextActive]}>{label}</Text>
        {active ? <Text style={styles.check}>✓</Text> : null}
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>おとなモード</Text>

      <View style={styles.card}>
        <Text style={styles.label}>かずの おおきさ</Text>
        <View style={styles.options}>
          <Option v={5} label="5まで" />
          <Option v={10} label="10まで" />
        </View>
        <Text style={styles.note}>
          4さいは「5まで」がおすすめ。なれてきたら「10まで」に。つぎのもんだいからかわります。
        </Text>
      </View>

      <View style={styles.spacer} />

      <BigButton emoji="◀️" label="もどる" onPress={onBack} color={colors.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: space.lg,
  },
  title: {
    fontSize: font.title,
    fontWeight: '800',
    color: colors.text,
    marginBottom: space.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.stageBorder,
  },
  label: {
    fontSize: font.body,
    fontWeight: '800',
    color: colors.text,
    marginBottom: space.md,
  },
  options: {
    flexDirection: 'row',
    columnGap: space.md,
  },
  option: {
    flex: 1,
    minHeight: 84,
    borderRadius: radius.md,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    columnGap: space.sm,
  },
  optionIdle: {
    backgroundColor: colors.surface,
    borderColor: colors.stageBorder,
  },
  optionActive: {
    backgroundColor: colors.play,
    borderColor: colors.playPressed,
  },
  optionText: {
    fontSize: font.big,
    fontWeight: '900',
    color: colors.text,
  },
  optionTextActive: {
    color: colors.white,
  },
  check: {
    fontSize: font.big,
    color: colors.white,
    fontWeight: '900',
  },
  note: {
    fontSize: font.small,
    color: colors.subtext,
    marginTop: space.md,
    lineHeight: 24,
  },
  spacer: {
    flex: 1,
  },
});