// node --test の読み込みの仕組み。新しい依存は入れず、Node 組み込みのフックと既存の typescript パッケージだけで動く。
//
//   npm test = node --test --import ./tests/register.mjs "tests/**/*.test.ts"
//
// src は Metro / Expo の書き方のままで、Node にはそのまま読ませられない。次の 5 つをここで肩代わりする（src は変えない）。
//   1. 拡張子の無い相対 import（"../types"）           … .ts / .tsx / index.ts を探して解決する
//   2. `type` の付かない型だけの import                 … Node 組み込みの型剥がしは実行時に落ちるので、TypeScript で変換して消す
//   3. .tsx（JSX）                                      … TypeScript で変換する（jsx は expo/tsconfig.base と同じ react-jsx）
//   4. react-native・expo・expo-*                       … tests/stubs/ の差し替えへ向ける
//   5. require("../../assets/svg/x.svg") などの素材     … 素材ごとに別の目印の値を返す（Metro の素材 require の代役）
// フックは同じスレッドで動く同期版（module.registerHooks）。

import { readFileSync, statSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const nodeRequire = createRequire(import.meta.url);

// ── 4. 差し替え先 ──────────────────────────────────────────
const REACT_NATIVE_STUB = new URL("./stubs/react-native.mjs", import.meta.url);
const EXPO_STUB = new URL("./stubs/expo.mjs", import.meta.url);

// ── 1. 解決 ───────────────────────────────────────────────
function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

// src/audio/bgm.ts と src/audio/bgm/ のように、同じ名前のファイルとディレクトリが並ぶので、ファイルを先に探す。
function findFile(path) {
  const candidates = [
    path,
    `${path}.ts`,
    `${path}.tsx`,
    join(path, "index.ts"),
    join(path, "index.tsx"),
  ];
  return candidates.find(isFile);
}

function resolve(specifier, context, nextResolve) {
  if (specifier === "react-native") {
    return { url: REACT_NATIVE_STUB.href, shortCircuit: true };
  }
  if (specifier === "expo" || specifier.startsWith("expo-")) {
    return { url: EXPO_STUB.href, shortCircuit: true };
  }
  if (/^react-native[-/]/.test(specifier)) {
    throw new Error(
      `tests/register.mjs: "${specifier}" の差し替えがありません。tests/stubs/ に足して resolve に登録してください`,
    );
  }
  if (/^(?:\.{1,2}\/|\/|file:)/.test(specifier) && context.parentURL) {
    const url = new URL(specifier, context.parentURL);
    const file = findFile(fileURLToPath(url));
    if (file) {
      const resolved = pathToFileURL(file);
      // "?instance=2" のような問い合わせは残す（別のモジュールとして読み直させるため）。
      resolved.search = url.search;
      return { url: resolved.href, shortCircuit: true };
    }
  }
  return nextResolve(specifier, context);
}

// ── 2・3. 変換 ────────────────────────────────────────────
let ts;
function transpile(source, fileName) {
  ts ??= nodeRequire("typescript");
  const { outputText, diagnostics } = ts.transpileModule(source, {
    fileName,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      inlineSourceMap: true,
    },
  });
  if (diagnostics && diagnostics.length > 0) {
    throw new Error(
      ts.formatDiagnostics(diagnostics, {
        getCurrentDirectory: () => process.cwd(),
        getCanonicalFileName: (name) => name,
        getNewLine: () => "\n",
      }),
    );
  }
  return outputText;
}

function load(url, context, nextLoad) {
  if (url.startsWith("file:") && /\.tsx?$/.test(new URL(url).pathname)) {
    const path = fileURLToPath(url);
    return {
      format: "module",
      source: transpile(readFileSync(path, "utf8"), path),
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}

// ── 5. 素材の require ─────────────────────────────────────
// ESM には require が無いので、グローバルに置いて src の require(...) をそのまま通す。
// 同じ書き方の素材には同じ値、違う素材には違う値を返す（problems.ts は svg の値の違いで「直前と別の種」を見分ける）。
const ASSET =
  /\.(?:svg|png|jpe?g|gif|webp|ico|m4a|mp3|wav|ogg|mp4|webm|ttf|otf)$/i;
const assets = new Map();

globalThis.require = function requireAsset(id) {
  if (typeof id !== "string" || !ASSET.test(id)) {
    throw new Error(
      `tests/register.mjs: require(${JSON.stringify(id)}) は素材ではないので差し替えられません。素材以外は import で書いてください`,
    );
  }
  let asset = assets.get(id);
  if (asset === undefined) {
    asset = Object.freeze({ uri: `asset:${id}` });
    assets.set(id, asset);
  }
  return asset;
};

registerHooks({ resolve, load });
process.setSourceMapsEnabled(true);
