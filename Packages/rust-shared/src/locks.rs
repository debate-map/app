use std::sync::Mutex;
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

pub struct RwLockV<T> {
    pub l: RwLock<T>,
    lock_history: Mutex<Vec<String>>,
}
impl<T> RwLockV<T> {
    pub async fn read(&self, caller: &str) -> RwLockReadGuard<'_, T> {
        self.lock_history.lock().unwrap().push(caller.to_owned() + " [read]");
        self.l.read().await
    }
    pub async fn write(&self, caller: &str) -> RwLockWriteGuard<'_, T> {
        self.lock_history.lock().unwrap().push(caller.to_owned() + " [write]");
        self.l.write().await
    }
    pub fn get_lock_history(&self) -> Vec<String> {
        let lock_history = self.lock_history.lock().unwrap();
        lock_history.iter().map(|a| a.clone()).collect::<Vec<_>>()
    }
}