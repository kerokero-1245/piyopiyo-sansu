// tests/register.mjs（src を Node で読むための仕組み）の確認。
// grid・problems・settings のテストは、この仕組みが働いていて初めて src を読めるので、仕組みも小さく固定しておく。

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as expoStub from "./stubs/expo.mjs";
import * as reactNativeStub from "./stubs/react-native.mjs";

describe("解決と変換", () => {
  it("拡張子の無い相対 import を .ts として読み、`type` の付かない型だけの import は消える", async () => {
    const { sides } = await import("./fixtures/loader/typeOnlyImport");
    assert.equal(sides({ sides: 3 }), 3);
  });

  it(".tsx（JSX）を読める", async () => {
    const { element } = await import("./fixtures/loader/view");
    const props: { id: string; children: string } = element.props;
    assert.equal(element.type, "span");
    assert.equal(props.id, "hello");
    assert.equal(props.children, "ぴよ");
  });

  it("同じ名前のファイルとディレクトリが並ぶときはファイルを読む", async () => {
    const { from } = await import("./fixtures/loader/pick");
    assert.equal(from, "file");
  });

  it("ディレクトリは index.ts を読む", async () => {
    const { from } = await import("./fixtures/loader/lib");
    assert.equal(from, "directory index");
  });

  it("問い合わせ（?instance=N）が違えば別のモジュールとして読み直し、同じなら同じ実体", async () => {
    // 問い合わせ付きの指定は TypeScript が解決できないので、式で渡す（型は自分で付ける）。
    type Counter = typeof import("./fixtures/loader/counter");
    const load = (query: string): Promise<Counter> =>
      import(`./fixtures/loader/counter?${query}`);
    const first = await load("instance=1");
    const again = await load("instance=1");
    const second = await load("instance=2");
    assert.equal(first.next(), 1);
    assert.equal(again.next(), 2, "同じ問い合わせは同じ実体");
    assert.equal(second.next(), 1, "別の問い合わせは別の実体");
  });
});

describe("差し替え", () => {
  it("react-native は tests/stubs/react-native.mjs（Platform.OS は web）", async () => {
    const reactNative = await import("react-native");
    assert.equal(reactNative.Platform, reactNativeStub.Platform);
    assert.equal(reactNativeStub.Platform.OS, "web");
  });

  it("expo と expo-* は tests/stubs/expo.mjs", async () => {
    const statusBar = await import("expo-status-bar");
    const expo = await import("expo");
    assert.equal(statusBar.StatusBar, expoStub.StatusBar);
    assert.equal(expo.registerRootComponent, expoStub.registerRootComponent);
  });

  it("差し替えの無い react-native-* は、黙って本物を読まずに分かる形で落ちる", async () => {
    const unstubbed: string = "react-native-web";
    await assert.rejects(import(unstubbed), /差し替えがありません/);
  });

  it("素材の require: 同じ書き方には同じ値、違う素材には違う値", () => {
    const hiyoko: unknown = require("../assets/svg/hiyoko.svg");
    assert.equal(require("../assets/svg/hiyoko.svg"), hiyoko);
    assert.notEqual(require("../assets/svg/piyo.svg"), hiyoko);
    assert.deepEqual(hiyoko, { uri: "asset:../assets/svg/hiyoko.svg" });
    assert.notEqual(
      require("../assets/voice/p_seikai.m4a"),
      require("../assets/voice/e_arere.m4a"),
    );
  });

  it("素材ではない require は、黙って通さずに落ちる", () => {
    assert.throws(() => require("react-native"), /素材ではないので/);
  });
});
