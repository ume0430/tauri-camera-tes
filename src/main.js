import { invoke } from "@tauri-apps/api/tauri";

let greetInputEl;
let greetMsgEl;
let photoImgEl;
let photoInfoEl;

async function greet() {
  const name = greetInputEl.value;
  greetMsgEl.textContent = await invoke("greet", { name });
}

async function takePhoto() {
  photoInfoEl.textContent = "撮影中...";
  photoImgEl.src = "";

  try {
    // Rust側の take_photo は Result<(Vec<u8>, String), String>
    const [bytes, mimeType] = await invoke("take_photo");

    const byteArray = new Uint8Array(bytes);
    const blob = new Blob([byteArray], { type: mimeType });
    const url = URL.createObjectURL(blob);

    photoImgEl.src = url;
    photoInfoEl.textContent = `撮影完了 (${mimeType}, ${bytes.length} bytes)`;
  } catch (e) {
    console.error(e);
    photoInfoEl.textContent = `エラー: ${e}`;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  // greet 用（テンプレ）
  greetInputEl = document.querySelector("#greet-input");
  greetMsgEl = document.querySelector("#greet-msg");
  document
    .querySelector("#greet-form")
    .addEventListener("submit", (e) => {
      e.preventDefault();
      greet();
    });

  // カメラ用
  photoImgEl = document.querySelector("#photo-img");
  photoInfoEl = document.querySelector("#photo-info");
  document
    .querySelector("#take-photo-button")
    .addEventListener("click", () => {
      takePhoto();
    });
});
