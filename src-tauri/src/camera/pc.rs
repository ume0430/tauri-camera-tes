use std::fs;
use std::path::PathBuf;

use super::service::CameraService;

pub struct PcCameraService;

impl CameraService for PcCameraService {
    fn capture(&self) -> Result<Vec<u8>, String> {
        // 仮実装：sample.jpg を読み込む
        let path = PathBuf::from("sample.jpg");
        fs::read(path).map_err(|e| e.to_string())
    }

    fn save(&self, image: &[u8], path: PathBuf) -> Result<(), String> {
        fs::write(path, image).map_err(|e| e.to_string())
    }
}
