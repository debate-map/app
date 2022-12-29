use std::{sync::{Mutex, Arc, atomic::{Ordering, AtomicI64}}, ops::{Deref, DerefMut}};
use anyhow::{anyhow, bail, Error};
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

#[derive(PartialEq, Eq)]
pub enum Lock {
    unknown_prior = 0,
    LQGroup_batches_x = 1,
    LQGroup_batches_meta = 2,
    LQGroup_lqis_awaiting_population = 3,
    LQGroup_lqis_committed = 4,
    LQInstance_entry_watchers = 5,
    LQInstance_last_entries = 6, // if this value changes, you must change where-clause of `LQInstance.set_last_entries`
}
pub struct LockChain<const T1: Lock, const T2: Lock> {
}

pub trait ValidLockChain<const T1: Lock, const T2: Lock> {}

/*impl ValidLockChain<{LockType::LQGroup_batches_meta}, {LockType::LQGroup_lqis_awaiting_population}> for LockChain<{LockType::LQGroup_batches_meta}, {LockType::LQGroup_lqis_awaiting_population}> {}
impl ValidLockChain<{LockType::LQGroup_lqis_awaiting_population}, {LockType::LQGroup_lqis_committed}> for LockChain<{LockType::LQGroup_lqis_awaiting_population}, {LockType::LQGroup_lqis_committed}> {}*/

pub enum Assert<const CHECK: bool> {}
pub trait IsTrue {}
impl IsTrue for Assert<true> {}

impl<const T1: Lock, const T2: Lock> ValidLockChain<T1, T2> for LockChain<T1, T2>
    where Assert::<{(T1 as usize) < (T2 as usize)}>: IsTrue,
{}

pub fn check_lock_chain_impl<const T1: Lock, const T2: Lock>(_chain: impl ValidLockChain<T1, T2>) {}

#[macro_export]
macro_rules! check_lock_chain {
    {$lt1:tt, $lt2:tt} => {
        $crate::utils::locks::rwlock_tracked::check_lock_chain_impl($crate::utils::locks::rwlock_tracked::LockChain::<$lt1, $lt2> {});
    };
    {$lt1:tt, $lt2:tt, $lt3:tt} => {
        $crate::utils::locks::rwlock_tracked::check_lock_chain_impl($crate::utils::locks::rwlock_tracked::LockChain::<$lt1, $lt2> {});
        $crate::utils::locks::rwlock_tracked::check_lock_chain_impl($crate::utils::locks::rwlock_tracked::LockChain::<$lt2, $lt3> {});
    };
    {$lt1:tt, $lt2:tt, $lt3:tt, $lt4:tt} => {
        $crate::utils::locks::rwlock_tracked::check_lock_chain_impl($crate::utils::locks::rwlock_tracked::LockChain::<$lt1, $lt2> {});
        $crate::utils::locks::rwlock_tracked::check_lock_chain_impl($crate::utils::locks::rwlock_tracked::LockChain::<$lt2, $lt3> {});
        $crate::utils::locks::rwlock_tracked::check_lock_chain_impl($crate::utils::locks::rwlock_tracked::LockChain::<$lt3, $lt4> {});
    };
}
pub(crate) use check_lock_chain;

pub fn check_lock_chain2<const T1: Lock, const T2: Lock>()
    where Assert::<{(T1 as usize) < (T2 as usize)}>: IsTrue,
{
    check_lock_chain_impl::<T1, T2>(LockChain::<T1, T2> {})
}
pub fn check_lock_chain3<const T1: usize, const T2: usize>()
    where Assert::<{T1 < T2}>: IsTrue,
{}

pub const fn a_less_than_b(a: Lock, b: Lock) -> bool {
    let (a, b) = (a as usize, b as usize);
    a < b
}