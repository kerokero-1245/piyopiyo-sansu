// おとなモード（親ゲートの奥）。かずの おおきさ（合計5まで / 10まで）を切り替える。
// 変更は次のもんだいから反映される（PlayScreen がマウント時に設定を読む / DESIGN §7）。

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, space } from '../theme';
import BigButton from '../components/BigButton';
import { getMaxSum, getTotalStars, MaxSum, resetStars, setMaxSum } from '../settings';
import { playSound } from '../audio/sounds';

interface Props {
  onBack: () => void;
}

export default function OtonaScreen({ onBack }: Props) {
  const [maxSum, setMax] = useState<MaxSum>(getMaxSum());
  const [stars, setStars] = useState<number>(getTotalStars());
  const [confirmReset, setConfirmReset] = useState(false); // 誤操作防止の2段階確認

  const choose = (v: MaxSum) => {
    playSound('tap');
    setMaxSum(v);
    setMax(v);
  };

  const onResetPress = () => {
    playSound('tap');
    if (!confirmReset) {
      setConfirmReset(true); // 1回目は確認へ
      return;
    }
    resetStars();
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

      {/* あつめた ほし（累計スタンプ）。数字スコアではなく“集めた⭐の数”。リセットはここだけ。 */}
      <View style={[styles.card, styles.cardGap]}>
        <Text style={styles.label}>あつめた ほし</Text>
        <Text style={styles.starTotal}>⭐ × {stars}</Text>
        <View style={styles.resetRow}>
          {confirmReset ? (
            <Pressable
              onPress={() => {
                playSound('tap');
                setConfirmReset(false);
              }}
              accessibilityRole="button"
              style={[styles.resetBtn, styles.resetCancel]}
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
              confirmReset ? styles.resetConfirm : styles.resetIdle,
              stars === 0 && !confirmReset ? styles.resetDisabled : null,
            ]}
          >
            <Text style={confirmReset ? styles.resetConfirmText : styles.resetIdleText}>
              {confirmReset ? 'ほんとうに 0に する' : '0に もどす'}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.note}>
          あつめた ほし は へりません。ここでだけ 0に もどせます。
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
  cardGap: {
    marginTop: space.md,
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
  starTotal: {
    fontSize: font.huge,
    fontWeight: '900',
    color: colors.text,
  },
  resetRow: {
    flexDirection: 'row',
    columnGap: space.sm,
    marginTop: space.md,
  },
  resetBtn: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  resetIdle: {
    backgroundColor: colors.surface,
    borderColor: colors.stageBorder,
  },
  resetIdleText: {
    fontSize: font.body,
    fontWeight: '800',
    color: colors.subtext,
  },
  resetConfirm: {
    backgroundColor: colors.button,
    borderColor: colors.buttonPressed,
  },
  resetConfirmText: {
    fontSize: font.body,
    fontWeight: '900',
    color: colors.white,
  },
  resetCancel: {
    backgroundColor: colors.surface,
    borderColor: colors.stageBorder,
  },
  resetCancelText: {
    fontSize: font.body,
    fontWeight: '800',
    color: colors.text,
  },
  resetDisabled: {
    opacity: 0.4,
  },
  spacer: {
    flex: 1,
  },
});