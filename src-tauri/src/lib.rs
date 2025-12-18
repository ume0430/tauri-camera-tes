use tauri_plugin_opener;

use std::{
    fs,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};

// 研究で提案している CameraService 抽象
use camera_service_proto::{CameraService, ImageData};
use camera_service_proto::desktop::DesktopCameraService;

/// アプリ全体で共有する状態
/// UI からは CameraService の実装詳細を見せない
pub struct AppState {
    pub camera: DesktopCameraService,
}

/// もともとの greet コマンド（動作確認用）
/// 研究とは直接関係しないが残して問題なし
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// CameraService を叩くコマンド
///
/// 共通仕様:
/// 「取得 → バイト列 + MIME 型を返す」
///
/// UI 側は
/// - PC / Android の違い
/// - カメラ API の違い
/// を一切意識しない
#[tauri::command]
fn take_photo(state: tauri::State<'_, AppState>) -> Result<(Vec<u8>, String), String> {
    let image: ImageData = state
        .camera
        .take_photo()
        // エラーは研究・デバッグしやすいよう Debug 表示
        .map_err(|e| format!("{:?}", e))?;

    Ok((image.bytes, image.mime_type))
}

/// 撮影した画像(bytes, mime_type)をファイル保存するコマンド
///
/// 保存先:
///   ~/Pictures/tauri_camera_test/photo_<UNIX秒>.<ext>
///
/// 戻り値:
///   保存したファイルのフルパス（文字列）
#[tauri::command]
fn save_photo(bytes: Vec<u8>, mime_type: String) -> Result<String, String> {
    // 保存先ディレクトリ: ~/Pictures/tauri_camera_test/
    let home = std::env::var("HOME").map_err(|e| format!("{:?}", e))?;
    let mut dir = PathBuf::from(home);
    dir.push("Pictures");
    dir.push("tauri_camera_test");

    fs::create_dir_all(&dir).map_err(|e| format!("{:?}", e))?;

    // MIME から拡張子を決定（最低限）
    let ext = match mime_type.as_str() {
        "image/jpeg" => "jpg",
        "image/png" => "png",
        _ => "bin",
    };

    // ファイル名: photo_<UNIX秒>.<ext>
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("{:?}", e))?;
    let filename = format!("photo_{}.{}", ts.as_secs(), ext);

    let mut path = dir;
    path.push(filename);

    fs::write(&path, bytes).map_err(|e| format!("{:?}", e))?;

    Ok(path.to_string_lossy().to_string())
}

/// Tauri エントリポイント
///
/// - CameraService の具体実装はここで注入
/// - UI / command 層は trait 越しにしか触れない
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            // PC 向け実装（Linux を想定）
            // Android では別実装に差し替える想定
            camera: DesktopCameraService::new("/dev/video0"),
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            take_photo,
            save_photo,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
