// node --test の読み込み（`--import ./tests/register.mjs`）。中身は piyo-assets のひな形
// （.ts・.tsx の変換・拡張子なしの import の補完・JSON・素材の require・react-native と expo の差し替え）で、
// ここにはこのアプリの差分だけを書く。
//  - react-native は tests/stubs/react-native.mjs、expo・expo-* は tests/stubs/expo.mjs
//  - 素材の require は { uri: "asset:<require の文字列>" }。同じ書き方には同じ値、違う素材には違う値
//    （problems.ts は svg の値の違いで「直前と別の種」を見分ける）
import { register } from "@kerokero-1245/piyo-assets/testing/register";

const expo = new URL("./stubs/expo.mjs", import.meta.url);
const assets = new Map();

register({
  root: new URL("../", import.meta.url),
  stubs: {
    "react-native": new URL("./stubs/react-native.mjs", import.meta.url),
    expo,
    "expo-*": expo,
  },
  asset: ({ specifier }) => {
    if (!assets.has(specifier)) {
      assets.set(specifier, Object.freeze({ uri: `asset:${specifier}` }));
    }
    return assets.get(specifier);
  },
});
