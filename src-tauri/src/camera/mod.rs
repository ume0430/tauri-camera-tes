pub mod service;
pub mod pc;

use service::CameraService;
use pc::PcCameraService;

pub fn get_camera_service() -> Box<dyn CameraService> {
    Box::new(PcCameraService)
}
