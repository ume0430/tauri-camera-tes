use tauri_plugin_opener;
use camera_service_proto::{CameraService, ImageData};
use camera_service_proto::desktop::DesktopCameraService;

pub struct AppState {
    pub camera: DesktopCameraService,
}

// もともとの greet コマンド（残してOK）
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// CameraService をたたくコマンドの形だけ用意
#[tauri::command]
fn take_photo(state: tauri::State<'_, AppState>) -> Result<(Vec<u8>, String), String> {
    let image: ImageData = state
        .camera
        .take_photo()
        .map_err(|e| e.to_string())?;

    Ok((image.bytes, image.mime_type))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            // camera_service_proto 側に new() がある前提。
            // もし default() しかなければ DesktopCameraService::default() に変える。
            camera: DesktopCameraService::new(),
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            take_photo,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
