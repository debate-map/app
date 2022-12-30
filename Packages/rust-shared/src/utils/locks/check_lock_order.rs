#[derive(PartialEq, Eq)]
pub enum Lock {
    unknown_prior = 0,
    LQGroup_batches_meta = 1,
    //LQGroup_lqis_awaiting_population = 2,
    LQGroup_batches_x = 2,
    //LQGroup_lqis_committed = 3,
    LQInstance_entry_watchers = 3,
    LQInstance_last_entries = 4, // sync this value with macro below
}
// these macros are needed for cases where comparisons are done in the "where" clause of a function (where Lock::X cannot be used)
#[macro_export]
macro_rules! lock_as_usize_LQInstance_last_entries { {} => { 4  } }

pub enum Assert<const CHECK: bool> {}
pub trait IsTrue {}
impl IsTrue for Assert<true> {}

/// Helper function to avoid deadlocks, by ensuring that if multiple locks are held simultaneously, that their acquisition order is the same each time.
/// * Usage: Whenever a given scope already holds a guard/lock of a type listed in the `Lock` enum ("T1"), and is about to acquire another ("T2"), call this function with T1 and T2 as const-parameters.
/// * Effect: The Rust compiler checks whether the "order value" of T1 is lower than that of T2 (as determined by the usize values in the Lock enum); if not, a compile-time error is thrown.
pub fn check_lock_order<const T1: Lock, const T2: Lock>()
    where Assert::<{(T1 as usize) < (T2 as usize)}>: IsTrue,
{}
/*pub fn check_lock_order_usize<const T1: usize, const T2: usize>()
    where Assert::<{T1 < T2}>: IsTrue,
{}*/

#[macro_export]
macro_rules! check_lock_chain {
    {$lt1:tt, $lt2:tt} => {
        $crate::utils::locks::rwlock_tracked::check_lock_order::<$lt1, $lt2>();
    };
    {$lt1:tt, $lt2:tt, $lt3:tt} => {
        $crate::utils::locks::rwlock_tracked::check_lock_order::<$lt1, $lt2>();
        $crate::utils::locks::rwlock_tracked::check_lock_order::<$lt2, $lt3>();
    };
    {$lt1:tt, $lt2:tt, $lt3:tt, $lt4:tt} => {
        $crate::utils::locks::rwlock_tracked::check_lock_order::<$lt1, $lt2>();
        $crate::utils::locks::rwlock_tracked::check_lock_order::<$lt2, $lt3>();
        $crate::utils::locks::rwlock_tracked::check_lock_order::<$lt3, $lt4>();
    };
}
pub(crate) use check_lock_chain;