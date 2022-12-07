use std::time::{SystemTime, Duration, UNIX_EPOCH};

pub fn time_since_epoch() -> Duration {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap()
}
/*pub fn time_since_epoch_ms_u128() -> u128 {
    time_since_epoch().as_millis()
}*/
pub fn time_since_epoch_ms() -> f64 {
    time_since_epoch().as_secs_f64() * 1000f64
}
pub fn time_since_epoch_ms_i64() -> i64 {
    //time_since_epoch().as_millis()
    time_since_epoch_ms() as i64
}
pub async fn tokio_sleep(sleep_time_in_ms: i64) {
    if sleep_time_in_ms <= 0 { return; }
    tokio::time::sleep(std::time::Duration::from_millis(sleep_time_in_ms as u64)).await;
}
pub async fn tokio_sleep_until(wake_time_as_ms_since_epoch: i64) {
    tokio_sleep(wake_time_as_ms_since_epoch - time_since_epoch_ms_i64()).await;
}