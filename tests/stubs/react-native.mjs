// react-native の差し替え（Node で動く最小限）。本物は Flow 記法で、Node では読めない。
// 使う側（src）が触るものだけを足していく。足りないと import 時に「export が無い」と落ちるので、そのとき足す。

// OS は書き換えられる（テストが "ios" などに切り替えて、web 以外の動きを確かめる）。
export const Platform = {
  OS: "web",
  select(spec) {
    return spec[Platform.OS] ?? spec.default;
  },
};

export const StyleSheet = {
  create: (styles) => styles,
  absoluteFill: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
};
