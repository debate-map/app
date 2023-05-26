# Backend (Rust)

Shortenings:
* "string-change": simply added an extra character to a string in the file `Packages/app-server/src/main.rs`. (first println in `main` function)
* "SW": Stephen Wicklund (aka Venryx)

## Fresh

Timings (fresh, standard, debug):
* 2023-05-26, SW (possibly not 100% fresh): "Finished dev [unoptimized + debuginfo] target(s) in 5m 19s"
* 2023-05-26, SW: "Finished dev [unoptimized + debuginfo] target(s) in 7m 01s"

Timings (fresh, cranelift-msvc, debug):
* 2023-05-26, SW: "Finished dev [unoptimized + debuginfo] target(s) in 5m 55s"

Timings (fresh, release, standard):
* 2023-05-26, SW (possibly not 100% fresh; had debug-build artifacts present): "Finished release [optimized] target(s) in 9m 47s"

Timings (fresh, release, cranelift-msvc):
* 2023-05-26, SW (possibly not 100% fresh; had debug-build artifacts present): "Finished release [optimized] target(s) in 5m 05s"

## Incremental

Timings (string-change, debug, standard):
* 2023-05-26, SW: "Finished dev [unoptimized + debuginfo] target(s) in 1m 01s"
* 2023-05-26, SW: "Finished dev [unoptimized + debuginfo] target(s) in 46.14s"

Timings (string-change, debug, cranelift-msvc):
* 2023-05-26, SW: "Finished dev [unoptimized + debuginfo] target(s) in 37.36s"
* 2023-05-26, SW: "Finished dev [unoptimized + debuginfo] target(s) in 49.32s"

# Frontend

* Path is currently: TypeScript [->tsc->] JS [->babel->] JS [->webpack->] js-bundle.
* Speed is alright, but could be improved. I'm planning to switch to Turbopack once it is ready for wider use.