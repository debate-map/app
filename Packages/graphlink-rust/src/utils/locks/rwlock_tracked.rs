use anyhow::{anyhow, bail, Error};
use std::{
	ops::{Deref, DerefMut},
	sync::{
		atomic::{AtomicI64, Ordering},
		Arc, Mutex,
	},
};
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

/// Wrapper around RwLock, which:
/// 1) Requires that anyone who takes a lock-guard must supply their "name".
/// 2) Provides a way for anyone to get a list of "current lock-guard holders". (without having to take a lock-guard themselves)
/// 3) Provides `read_checked` and `write_checked` functions; these allow you to get a read-lock, drop it, then get a write-lock later, while confirming
///    that no other threads have obtained a write-lock during the "lock-free" period. (if they have, then the `write_checked` function will return an error)
pub struct RwLock_Tracked<T> {
	l: RwLock<T>,
	live_guards: Arc<Mutex<Vec<String>>>,
	write_guards_acquired: AtomicI64,
}
impl<T> RwLock_Tracked<T> {
	pub fn new(lock_value: T) -> Self {
		Self { l: RwLock::new(lock_value), live_guards: Arc::new(Mutex::new(vec![])), write_guards_acquired: AtomicI64::new(0) }
	}

	pub async fn read(&self, caller: &str) -> RwLockReadGuard_Tracked<'_, T> {
		let base_guard = self.l.read().await;
		RwLockReadGuard_Tracked::new(base_guard, self.live_guards.clone(), caller.to_owned())
	}
	pub async fn write(&self, caller: &str) -> RwLockWriteGuard_Tracked<'_, T> {
		let base_guard = self.l.write().await;
		// on orderings, see: https://stackoverflow.com/a/33293463 and https://reddit.com/r/rust/comments/p9a740
		self.write_guards_acquired.fetch_add(1, Ordering::Acquire);
		RwLockWriteGuard_Tracked::new(base_guard, self.live_guards.clone(), caller.to_owned())
	}

	/// Same as `read`, except also returns a "prior write-lock count", which can later be provided to `write_checked`, to
	/// confirm that no other threads have obtained a write-lock during the "lock-free" period. (if they have, then the `write_checked` function will return an error)
	pub async fn read_checked(&self, caller: &str) -> (RwLockReadGuard_Tracked<'_, T>, i64) {
		//let prior_write_lock_count = self.live_guards.lock().unwrap().iter().filter(|a| a.ends_with(" [write]")).count() as i64;
		// on orderings, see: https://stackoverflow.com/a/33293463 and https://reddit.com/r/rust/comments/p9a740
		let prior_write_lock_count = self.write_guards_acquired.load(Ordering::Acquire);

		let guard = self.read(caller).await;
		(guard, prior_write_lock_count)
	}
	/// Same as `write`, except also checks whether other write-locks have been acquired since the time that the associated `read_checked` call as made. (ie. during this thread's "lock-free" period)
	/// If other write-locks were acquired during that period, then this `write_checked` function will return an error. (meant to be used for call-paths that are "retry-capable")
	pub async fn write_checked(&self, caller: &str, old_write_lock_count: i64) -> Result<RwLockWriteGuard_Tracked<'_, T>, Error> {
		let guard = self.write(caller).await;

		// check whether any other write-locks were acquired during the "lock-free" period

		//let new_write_lock_count = self.live_guards.lock().unwrap().iter().filter(|a| a.ends_with(" [write]")).count() as i64;
		// on orderings, see: https://stackoverflow.com/a/33293463 and https://reddit.com/r/rust/comments/p9a740
		let new_write_lock_count = self.write_guards_acquired.load(Ordering::Acquire);

		let other_write_locks_acquired = (new_write_lock_count - old_write_lock_count) - 1;
		if other_write_locks_acquired > 0 {
			bail!("write_checked failed: {other_write_locks_acquired} other write-lock(s) were acquired between the calling of `read_checked` and `write_checked`.");
		}
		Ok(guard)
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
