use std::path::PathBuf;

pub trait CameraService {
    /// 画像を取得する（撮影 or 選択）
    fn capture(&self) -> Result<Vec<u8>, String>;

    /// 取得した画像を保存する
    fn save(&self, image: &[u8], path: PathBuf) -> Result<(), String>;
}
