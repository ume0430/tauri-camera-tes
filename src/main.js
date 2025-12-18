// 画面に状態/エラーを出す（DevTools無しでも原因が見える）
const photoInfoEl = document.getElementById("photo-info");
const photoImgEl = document.getElementById("photo-img");

// 最後に撮影した画像を保持（保存ボタンで使う）
let lastBytes = null;   // number[] を想定
let lastMimeType = null; // string

function setInfo(msg) {
  if (photoInfoEl) photoInfoEl.textContent = msg;
  console.log(msg);
}

window.addEventListener("error", (e) => {
  setInfo("JS error: " + (e.message || e.type));
});

window.addEventListener("unhandledrejection", (e) => {
  setInfo("Promise error: " + (e.reason?.message || String(e.reason)));
});

// Tauri を “バンドラ無し” で使うため、window.__TAURI__ から invoke を取る
function getInvoke() {
  const t = window.__TAURI__;
  if (!t) throw new Error("__TAURI__ not found. tauri.conf.json の withGlobalTauri を確認して。");

  // Tauri v2: __TAURI__.core.invoke / v1: __TAURI__.tauri.invoke
  if (t.core?.invoke) return t.core.invoke;
  if (t.tauri?.invoke) return t.tauri.invoke;

  throw new Error("invoke not found in __TAURI__");
}

// Rust の戻り値を [bytes, mime] に正規化する
function normalizePhotoResult(result) {
  // 期待: [bytes, mimeType]
  if (Array.isArray(result) && result.length >= 2) {
    return [result[0], result[1]];
  }

  // もしオブジェクト形式で来た場合の保険
  // { bytes: [...], mime_type: "image/jpeg" } / { bytes: [...], mimeType: "image/jpeg" } など
  if (result && typeof result === "object") {
    const bytes = result.bytes ?? result[0];
    const mime =
      result.mime_type ?? result.mimeType ?? result[1];

    return [bytes, mime];
  }

  throw new Error("Unexpected take_photo result shape: " + JSON.stringify(result));
}

async function takePhoto() {
  setInfo("撮影中...");
  if (photoImgEl) photoImgEl.src = "";

  // 前回の保持をリセット
  lastBytes = null;
  lastMimeType = null;

  const invoke = getInvoke();

  // Rust 側: Result<(Vec<u8>, String), String>
  const result = await invoke("take_photo");

  const [bytes, mimeType] = normalizePhotoResult(result);

  // 保存用に保持（Vec<u8> -> JS では number[] として来る想定）
  lastBytes = bytes;
  lastMimeType = mimeType;

  // 表示用に Blob 化
  const byteArray = new Uint8Array(bytes);
  const blob = new Blob([byteArray], { type: mimeType });
  const url = URL.createObjectURL(blob);

  if (photoImgEl) photoImgEl.src = url;
  setInfo(`撮影完了 (${mimeType}, ${bytes.length} bytes)`);
}

async function savePhoto() {
  if (!lastBytes || !lastMimeType) {
    setInfo("先に撮影してください（保存する画像がありません）");
    return;
  }

  setInfo("保存中...");

  const invoke = getInvoke();

  // Rust 側: save_photo(bytes: Vec<u8>, mime_type: String) -> Result<String, String>
  const savedPath = await invoke("save_photo", {
    bytes: lastBytes,
    mimeType: lastMimeType, // ← ここが正解（camelCase）
  });

  setInfo(`保存完了: ${savedPath}`);
}

window.addEventListener("DOMContentLoaded", () => {
  // 要素チェック
  const takeBtn = document.getElementById("take-photo-button");
  const saveBtn = document.getElementById("save-photo-button");

  if (!takeBtn || !photoInfoEl || !photoImgEl) {
    setInfo("HTML要素が見つからない: #take-photo-button / #photo-info / #photo-img");
    return;
  }

  takeBtn.addEventListener("click", () => {
    takePhoto().catch((e) => setInfo("エラー: " + (e?.message || String(e))));
  });

  // 保存ボタンがある場合だけ有効化（無い場合はメッセージ出す）
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      savePhoto().catch((e) => setInfo("エラー: " + (e?.message || String(e))));
    });
  } else {
    // HTMLにボタンが無い場合に気づけるようにする
    console.warn("save button not found: #save-photo-button");
  }

  setInfo("ready");
});
