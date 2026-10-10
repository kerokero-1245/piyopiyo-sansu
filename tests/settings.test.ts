// src/settings.ts の現状固定。保存キーと値の形式、⭐の控えの規則（DESIGN §7・§14）。
//
// settings.ts は読んだ値をモジュールの中に覚える（セッション内キャッシュ）ので、テストごとに別の
// モジュールとして読み直す（"?instance=N" を付けて import すると、tests/register.mjs が別の実体として扱う）。
// localStorage は偽物をグローバルに置いて、読み書きの記録を取る。react-native の Platform は
// tests/stubs/react-native.mjs（OS は "web" から始まる）。

import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { Platform } from "./stubs/react-native.mjs";

type Settings = typeof import("../src/settings");

// 保存キー。『保存データ』なので、実装の定数を参照せず文字列で固定する。
const KEY = {
  maxSum: "sansu.maxSum",
  totalStars: "sansu.totalStars",
  starsResetAt: "sansu.starsResetAt",
  tts: "sansu.tts",
  bgm: "sansu.bgm",
} as const;

// ── 偽の localStorage ───────────────────────────────────
class FakeStorage {
  readonly data = new Map<string, string>();
  readonly log: string[] = [];
  failGet = false;
  failSet = false;
  failRemove = false;

  constructor(initial: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(initial)) {
      this.data.set(key, value);
    }
  }

  getItem(key: string): string | null {
    this.log.push(`get ${key}`);
    if (this.failGet) throw new Error("getItem failed");
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.log.push(`set ${key}=${value}`);
    if (this.failSet) throw new Error("setItem failed");
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.log.push(`remove ${key}`);
    if (this.failRemove) throw new Error("removeItem failed");
    this.data.delete(key);
  }
}

function installStorage(value: FakeStorage | undefined): void {
  Object.defineProperty(globalThis, "localStorage", {
    value,
    configurable: true,
    writable: true,
  });
}

let instance = 0;

// 新しい settings モジュールを、偽の保存（stored を入れた状態）で開く。
async function open(
  stored: Record<string, string> = {},
  os = "web",
): Promise<{ settings: Settings; storage: FakeStorage }> {
  const storage = new FakeStorage(stored);
  installStorage(storage);
  Platform.OS = os;
  instance += 1;
  const settings: Settings = await import(
    `../src/settings?instance=${instance}`
  );
  return { settings, storage };
}

afterEach(() => {
  Platform.OS = "web";
  Reflect.deleteProperty(globalThis, "localStorage");
});

const numberAt = (storage: FakeStorage, key: string): number =>
  Number(storage.data.get(key));

// ── 保存キーと値の形式 ───────────────────────────────────
describe("保存キーと値の形式（保存データの互換）", () => {
  it("書き込むキーは 5 つだけで、キーの文字列と値の形式は今のまま", async () => {
    const { settings, storage } = await open();
    settings.setMaxSum(20);
    settings.addStars(3);
    settings.resetShownStars();
    settings.setTtsOn(false);
    settings.setBgmOn(false);
    assert.deepEqual(Object.fromEntries(storage.data), {
      "sansu.maxSum": "20",
      "sansu.totalStars": "3",
      "sansu.starsResetAt": "3",
      "sansu.tts": "off",
      "sansu.bgm": "off",
    });
  });

  it("maxSum は 5・10・20 を数値の文字列で保存する", async () => {
    for (const value of [5, 10, 20] as const) {
      const { settings, storage } = await open();
      settings.setMaxSum(value);
      assert.equal(storage.data.get(KEY.maxSum), String(value));
    }
  });

  it("よみあげ・BGM は 'on' / 'off' で保存する", async () => {
    const { settings, storage } = await open();
    settings.setTtsOn(true);
    settings.setBgmOn(true);
    assert.equal(storage.data.get(KEY.tts), "on");
    assert.equal(storage.data.get(KEY.bgm), "on");
    settings.setTtsOn(false);
    settings.setBgmOn(false);
    assert.equal(storage.data.get(KEY.tts), "off");
    assert.equal(storage.data.get(KEY.bgm), "off");
  });

  it("読むだけでは何も書かない", async () => {
    const { settings, storage } = await open();
    settings.getMaxSum();
    settings.getTotalStars();
    settings.getShownStars();
    settings.getTtsOn();
    settings.getBgmOn();
    assert.deepEqual(
      storage.log.filter((entry) => !entry.startsWith("get ")),
      [],
    );
  });
});

// ── 読み出し（既定・保存済み・壊れた値）─────────────────────────
describe("読み出し", () => {
  it("何も保存されていなければ既定: 5まで・累計 0・表示 0・よみあげ オン・BGM オン", async () => {
    const { settings } = await open();
    assert.equal(settings.getMaxSum(), 5);
    assert.equal(settings.getTotalStars(), 0);
    assert.equal(settings.getShownStars(), 0);
    assert.equal(settings.getTtsOn(), true);
    assert.equal(settings.getBgmOn(), true);
  });

  it("保存された値を読む", async () => {
    for (const value of [5, 10, 20] as const) {
      const { settings } = await open({ [KEY.maxSum]: String(value) });
      assert.equal(settings.getMaxSum(), value);
    }
    const { settings } = await open({
      [KEY.totalStars]: "7",
      [KEY.tts]: "off",
      [KEY.bgm]: "off",
    });
    assert.equal(settings.getTotalStars(), 7);
    assert.equal(settings.getShownStars(), 7);
    assert.equal(settings.getTtsOn(), false);
    assert.equal(settings.getBgmOn(), false);
  });

  it("壊れた値は既定へ（maxSum は 5・累計と控えは 0・よみあげ/BGM は オン）", async () => {
    for (const broken of ["7", "abc", "", "05", "5.5"]) {
      const { settings } = await open({ [KEY.maxSum]: broken });
      assert.equal(settings.getMaxSum(), 5, `maxSum=${JSON.stringify(broken)}`);
    }
    for (const broken of ["abc", "-3", ""]) {
      const { settings } = await open({
        [KEY.totalStars]: broken,
        [KEY.starsResetAt]: broken,
      });
      assert.equal(settings.getTotalStars(), 0, `totalStars=${broken}`);
      assert.equal(settings.getShownStars(), 0, `starsResetAt=${broken}`);
    }
    const { settings } = await open({ [KEY.tts]: "maybe", [KEY.bgm]: "1" });
    assert.equal(settings.getTtsOn(), true);
    assert.equal(settings.getBgmOn(), true);
  });

  it("一度読んだ値は同じ起動中は覚えていて、保存を読み直さない", async () => {
    const { settings, storage } = await open({
      [KEY.maxSum]: "10",
      [KEY.tts]: "off",
    });
    assert.equal(settings.getMaxSum(), 10);
    assert.equal(settings.getTtsOn(), false);
    storage.data.set(KEY.maxSum, "20");
    storage.data.set(KEY.tts, "on");
    assert.equal(settings.getMaxSum(), 10);
    assert.equal(settings.getTtsOn(), false);
  });
});

// ── ⭐ の累計と、表示の控え ──────────────────────────────────
describe("あつめた ほし（DESIGN §14）", () => {
  it("1 つずつ加わる。引数で個数を指定でき、新しい累計を返す", async () => {
    const { settings, storage } = await open();
    assert.equal(settings.addStars(), 1);
    assert.equal(settings.addStars(), 2);
    assert.equal(settings.addStars(3), 5);
    assert.equal(settings.getTotalStars(), 5);
    assert.equal(storage.data.get(KEY.totalStars), "5");
  });

  it("累計は減らない（0 や負の個数を渡しても減らない）", async () => {
    const { settings, storage } = await open({ [KEY.totalStars]: "4" });
    assert.equal(settings.addStars(0), 4);
    assert.equal(settings.addStars(-5), 4);
    assert.equal(settings.getTotalStars(), 4);
    assert.equal(storage.data.get(KEY.totalStars), "4");
  });

  it("0 に もどすは表示だけ: 累計（街へ渡す値）は変えず、もどした時点の累計を控えに残す", async () => {
    const { settings, storage } = await open({ [KEY.totalStars]: "7" });
    assert.equal(settings.getShownStars(), 7);
    settings.resetShownStars();
    assert.equal(settings.getShownStars(), 0);
    assert.equal(storage.data.get(KEY.totalStars), "7", "累計は 7 のまま");
    assert.equal(storage.data.get(KEY.starsResetAt), "7", "もどした時点の累計");
    settings.addStars(2);
    assert.equal(settings.getShownStars(), 2, "表示は 控え から数え直す");
    assert.equal(storage.data.get(KEY.totalStars), "9");
  });

  it("どんな順に操作しても、保存された累計は減らない", async () => {
    const { settings, storage } = await open({
      [KEY.totalStars]: "7",
      [KEY.starsResetAt]: "9",
    });
    const operations: (() => unknown)[] = [
      () => settings.getShownStars(), // 控え > 累計 → 控えを捨てる
      () => settings.addStars(2),
      () => settings.resetShownStars(),
      () => settings.addStars(-3),
      () => settings.getShownStars(),
      () => settings.resetShownStars(),
      () => settings.addStars(0),
      () => settings.addStars(),
      () => settings.getShownStars(),
    ];
    let previous = numberAt(storage, KEY.totalStars);
    for (const [index, operate] of operations.entries()) {
      operate();
      const current = numberAt(storage, KEY.totalStars);
      assert.ok(current >= previous, `操作 ${index} で累計が減った`);
      previous = current;
    }
    assert.equal(previous, 10);
  });

  it("控え > 累計 と分かったら、表示を読むときに控えを捨てる（累計は触らない）", async () => {
    const { settings, storage } = await open({
      [KEY.totalStars]: "7",
      [KEY.starsResetAt]: "9",
    });
    assert.equal(settings.getShownStars(), 7, "控えの無い旧データと同じ表示");
    assert.equal(storage.data.has(KEY.starsResetAt), false, "控えのキーを消す");
    assert.equal(storage.data.get(KEY.totalStars), "7", "累計はそのまま");
    settings.addStars(5);
    assert.equal(
      settings.getShownStars(),
      12,
      "以前は 累計 12 - 控え 9 = 3 に減って見えた",
    );
  });

  it("⭐を加える前にも捨てる（おとなモードもがんばりカードも開かずに遊んでも減って見えない）", async () => {
    const { settings, storage } = await open({
      [KEY.totalStars]: "7",
      [KEY.starsResetAt]: "9",
    });
    settings.addStars();
    assert.equal(
      storage.data.has(KEY.starsResetAt),
      false,
      "最初の加算で、加える前に控えを捨てる",
    );
    for (let i = 0; i < 4; i++) settings.addStars();
    assert.equal(storage.data.get(KEY.totalStars), "12");
    assert.equal(settings.getShownStars(), 12);
  });

  it("控え = 累計 なら捨てない（表示は 0）", async () => {
    const { settings, storage } = await open({
      [KEY.totalStars]: "5",
      [KEY.starsResetAt]: "5",
    });
    assert.equal(settings.getShownStars(), 0);
    assert.equal(storage.data.get(KEY.starsResetAt), "5");
  });

  it("控え < 累計 なら 累計 - 控え を表示する（控えは残す）", async () => {
    const { settings, storage } = await open({
      [KEY.totalStars]: "10",
      [KEY.starsResetAt]: "4",
    });
    assert.equal(settings.getShownStars(), 6);
    assert.equal(storage.data.get(KEY.starsResetAt), "4");
  });
});

// ── 保存できなくても遊びは壊れない ────────────────────────────
describe("保存が使えなくても壊れない（罰・失敗表示はしない）", () => {
  it("読み出しが例外でも、既定値を返して例外を外へ出さない", async () => {
    const { settings, storage } = await open({
      [KEY.maxSum]: "20",
      [KEY.totalStars]: "7",
      [KEY.tts]: "off",
      [KEY.bgm]: "off",
    });
    storage.failGet = true;
    assert.equal(settings.getMaxSum(), 5);
    assert.equal(settings.getTotalStars(), 0);
    assert.equal(settings.getShownStars(), 0);
    assert.equal(settings.getTtsOn(), true);
    assert.equal(settings.getBgmOn(), true);
  });

  it("書き込みが例外でも例外を外へ出さず、同じ起動中は値を覚えている", async () => {
    const { settings, storage } = await open();
    storage.failSet = true;
    settings.setMaxSum(10);
    assert.equal(settings.getMaxSum(), 10);
    assert.equal(settings.addStars(), 1);
    assert.equal(settings.getTotalStars(), 1);
    settings.resetShownStars();
    assert.equal(settings.getShownStars(), 0);
    settings.setTtsOn(false);
    settings.setBgmOn(false);
    assert.equal(settings.getTtsOn(), false);
    assert.equal(settings.getBgmOn(), false);
    assert.equal(storage.data.size, 0, "何も保存できていない");
  });

  it("控えを消せなくても例外を出さず、同じ起動中は控えなしの表示を保つ", async () => {
    const { settings, storage } = await open({
      [KEY.totalStars]: "7",
      [KEY.starsResetAt]: "9",
    });
    storage.failRemove = true;
    assert.equal(settings.getShownStars(), 7);
    settings.addStars(5);
    assert.equal(settings.getShownStars(), 12);
  });

  it("localStorage を参照するだけで例外になる環境でも、既定値で動く", async () => {
    const { settings } = await open();
    Object.defineProperty(globalThis, "localStorage", {
      get() {
        throw new Error("SecurityError");
      },
      configurable: true,
    });
    assert.equal(settings.getMaxSum(), 5);
    settings.setMaxSum(20);
    assert.equal(settings.getMaxSum(), 20);
    assert.equal(settings.addStars(2), 2);
    assert.equal(settings.getShownStars(), 2);
  });

  it("localStorage が無い環境でも、既定値で動く", async () => {
    const { settings } = await open();
    installStorage(undefined);
    assert.equal(settings.getTtsOn(), true);
    settings.setTtsOn(false);
    assert.equal(settings.getTtsOn(), false);
    assert.equal(settings.addStars(), 1);
  });
});

describe("web 以外（native）", () => {
  it("localStorage があっても読み書きしない。同じ起動中の値だけを覚える", async () => {
    const { settings, storage } = await open(
      { [KEY.maxSum]: "20", [KEY.totalStars]: "7", [KEY.tts]: "off" },
      "ios",
    );
    assert.equal(settings.getMaxSum(), 5, "保存された 20 は読まない");
    assert.equal(settings.getTotalStars(), 0);
    assert.equal(settings.getTtsOn(), true);
    settings.setMaxSum(10);
    settings.setTtsOn(false);
    assert.equal(settings.addStars(2), 2);
    settings.resetShownStars();
    settings.addStars();
    assert.equal(settings.getMaxSum(), 10);
    assert.equal(settings.getTtsOn(), false);
    assert.equal(settings.getShownStars(), 1);
    assert.deepEqual(storage.log, [], "localStorage に触っていない");
  });
});
