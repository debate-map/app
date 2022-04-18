use std::{sync::{Mutex, Arc}, ops::{Deref, DerefMut}};
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

/// Wrapper around RwLock, which:
/// 1) Requires that anyone who takes a lock-guard must supply their "name".
/// 2) Provides a way for anyone to get a list of "current lock-guard holders". (without having to take a lock-guard themselves)
pub struct RwLock_Tracked<T> {
    l: RwLock<T>,
    live_guards: Arc<Mutex<Vec<String>>>,
}
impl<T> RwLock_Tracked<T> {
    pub fn new(lock_value: T) -> Self {
        Self {
            l: RwLock::new(lock_value),
            live_guards: Arc::new(Mutex::new(vec![])),
        }
    }

    pub async fn read(&self, caller: &str) -> RwLockReadGuard_Tracked<'_, T> {
        let base_guard = self.l.read().await;
        RwLockReadGuard_Tracked::new(base_guard, self.live_guards.clone(), caller.to_owned())
    }
    pub async fn write(&self, caller: &str) -> RwLockWriteGuard_Tracked<'_, T> {
        let base_guard = self.l.write().await;
        RwLockWriteGuard_Tracked::new(base_guard, self.live_guards.clone(), caller.to_owned())
    }

    pub fn get_live_guards(&self) -> Vec<String> {
        let live_guards = self.live_guards.lock().unwrap();
        live_guards.iter().map(|a| a.clone()).collect::<Vec<_>>()
    }
    pub fn get_live_guards_str(&self) -> String {
        let live_guards = self.live_guards.lock().unwrap();
        if live_guards.len() == 0 {
            return "[none]".to_owned();
        }
        live_guards.iter().map(|a| a.clone()).collect::<Vec<_>>().join("   ;   ")
    }
}

pub struct RwLockReadGuard_Tracked<'a, T> {
    base: RwLockReadGuard<'a, T>,
    live_guards: Arc<Mutex<Vec<String>>>,
    access_key: String,
}
impl<'a, T> RwLockReadGuard_Tracked<'a, T> {
    pub fn new(base_guard: RwLockReadGuard<'a, T>, live_guards: Arc<Mutex<Vec<String>>>, caller: String) -> Self {
        let access_key = caller + " [read]";
        live_guards.lock().unwrap().push(access_key.clone());
        Self { base: base_guard, live_guards, access_key }
    }
}
impl<'a, T> Deref for RwLockReadGuard_Tracked<'a, T> {
    type Target = RwLockReadGuard<'a, T>;
    fn deref(&self) -> &Self::Target {
        &self.base
    }
}
impl<'a, T> DerefMut for RwLockReadGuard_Tracked<'a, T> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.base
    }
}
impl<'a, T> Drop for RwLockReadGuard_Tracked<'a, T> {
    fn drop(&mut self) {
        let mut live_guards = self.live_guards.lock().unwrap();
        let index = live_guards.iter().position(|a| *a == self.access_key).unwrap();
        live_guards.remove(index);
    }
}

pub struct RwLockWriteGuard_Tracked<'a, T> {
    base: RwLockWriteGuard<'a, T>,
    live_guards: Arc<Mutex<Vec<String>>>,
    access_key: String,
}
impl<'a, T> RwLockWriteGuard_Tracked<'a, T> {
    pub fn new(base_guard: RwLockWriteGuard<'a, T>, live_guards: Arc<Mutex<Vec<String>>>, caller: String) -> Self {
        let access_key = caller + " [write]";
        live_guards.lock().unwrap().push(access_key.clone());
        Self { base: base_guard, live_guards, access_key }
    }
}
impl<'a, T> Deref for RwLockWriteGuard_Tracked<'a, T> {
    type Target = RwLockWriteGuard<'a, T>;
    fn deref(&self) -> &Self::Target {
        &self.base
    }
}
impl<'a, T> DerefMut for RwLockWriteGuard_Tracked<'a, T> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.base
    }
}
impl<'a, T> Drop for RwLockWriteGuard_Tracked<'a, T> {
    fn drop(&mut self) {
        let mut live_guards = self.live_guards.lock().unwrap();
        let index = live_guards.iter().position(|a| *a == self.access_key).unwrap();
        live_guards.remove(index);
    }
}