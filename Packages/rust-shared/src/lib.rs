use std::time::{UNIX_EPOCH, SystemTime, Duration};

pub mod errors;
pub use errors::*;
pub mod locks;
pub use locks::*;

pub fn time_since_epoch() -> Duration {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap()
}
pub fn time_since_epoch_ms() -> f64 {
    time_since_epoch().as_secs_f64() * 1000f64
}