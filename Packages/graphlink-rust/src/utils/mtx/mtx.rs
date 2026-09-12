// if debug build, re-export from mtx_real; else, from mtx_stub
// (note: this compilation-flag is active/"debug" when opt-level is exactly 0; see: https://github.com/rust-lang/rust/blob/44d679b9021f03a79133021b94e6d23e9b55b3ab/compiler/rustc_session/src/config.rs#L2519)
// ==========

#[cfg(debug_assertions)] mod mtx_real;
#[cfg(debug_assertions)] pub use mtx_real::*;

#[cfg(not(debug_assertions))] mod mtx_stub;
#[cfg(not(debug_assertions))] pub use mtx_stub::*;
