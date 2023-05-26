# Backend (Rust)

Shortenings:
* "string-change": simply added an extra character to a string in the file `Packages/app-server/src/main.rs`. (first println in `main` function)
* "SW": Stephen Wicklund (aka Venryx)

## Fresh

Timings (fresh, debug, rustc):
* 2023-05-26, SW (possibly not 100% fresh): "Finished dev [unoptimized + debuginfo] target(s) in 5m 19s"
* 2023-05-26, SW: "Finished dev [unoptimized + debuginfo] target(s) in 7m 01s"
* 2023-05-26b, SW (possibly not 100% fresh): "Finished dev [unoptimized + debuginfo] target(s) in 5m 11s"

Timings (fresh, debug, cranelift-msvc):
* 2023-05-26, SW: "Finished dev [unoptimized + debuginfo] target(s) in 5m 55s"
* 2023-05-26b, SW: "Finished dev [unoptimized + debuginfo] target(s) in 4m 25s"

Timings (fresh, release, rustc):
* 2023-05-26, SW (possibly not 100% fresh; had debug-build artifacts present): "Finished release [optimized] target(s) in 9m 47s"
* 2023-05-26b, SW (possibly not 100% fresh; had debug-build artifacts present): "Finished release [optimized] target(s) in 8m 21s"

Timings (fresh, release, cranelift-msvc):
* 2023-05-26, SW (possibly not 100% fresh; had debug-build artifacts present): "Finished release [optimized] target(s) in 5m 05s"
* 2023-05-26b, SW (possibly not 100% fresh; had debug-build artifacts present): "Finished release [optimized] target(s) in 4m 03s"

### In docker

Timings (fresh, in-docker-debug, rustc):
* 2023-05-26b, SW (likely not 100% fresh; likely read from cache-mount): "Finished dev [unoptimized + debuginfo] target(s) in 2m 39s"
* 2023-05-26b, SW (likely not 100% fresh; likely read from cache-mount): "Finished dev [unoptimized + debuginfo] target(s) in 2m 50s"

Timings (fresh, in-docker-debug, cranelift-msvc):
* 2023-05-26b, SW (possibly not 100% fresh; possibly read from cache-mount): "Finished dev [unoptimized + debuginfo] target(s) in 4m 15s"
* 2023-05-26b, SW (possibly not 100% fresh; possibly read from cache-mount): "Finished dev [unoptimized + debuginfo] target(s) in 2m 02s"
* 2023-05-26b, SW (possibly not 100% fresh; possibly read from cache-mount): "Finished dev [unoptimized + debuginfo] target(s) in 1m 56s"

Timings (fresh, in-docker-release, rustc):
* 2023-05-26b, SW (likely not 100% fresh; likely read from cache-mount): "Finished release [optimized] target(s) in 7m 25s"
* 2023-05-26b, SW (likely not 100% fresh; likely read from cache-mount): "Finished release [optimized] target(s) in 8m 53s"

Timings (fresh, in-docker-release, cranelift-msvc):
* 2023-05-26b, SW (possibly not 100% fresh; possibly read from cache-mount): "Finished release [optimized] target(s) in 4m 00s"
* 2023-05-26b, SW (possibly not 100% fresh; possibly read from cache-mount): "Finished release [optimized] target(s) in 3m 35s"
* 2023-05-26b, SW (possibly not 100% fresh; possibly read from cache-mount): "Finished release [optimized] target(s) in 2m 04s"

## Incremental

Timings (string-change, debug, rustc):
* 2023-05-26, SW: "Finished dev [unoptimized + debuginfo] target(s) in 1m 01s"
* 2023-05-26, SW: "Finished dev [unoptimized + debuginfo] target(s) in 46.14s"

Timings (string-change, debug, cranelift-msvc):
* 2023-05-26, SW: "Finished dev [unoptimized + debuginfo] target(s) in 37.36s"
* 2023-05-26, SW: "Finished dev [unoptimized + debuginfo] target(s) in 49.32s"

Timings (string-change, release, rustc): TODO
Timings (string-change, release, cranelift-msvc): TODO

### In docker

Timings (string-change, in-docker-debug, rustc):
* 2023-05-26b, SW: "Finished dev [unoptimized + debuginfo] target(s) in 23.82s" (341mb for new-layer, during heavy map-load: 51s to 3000subs [dm debug stats], ~248m max cpu-usage [kubectl top pod -> app-server], ~15% max cpu-usage [grafana -> cluster])
* 2023-05-26b, SW: "Finished dev [unoptimized + debuginfo] target(s) in 24.49s" (341mb for new-layer, during heavy map-load: 50s to 3000subs [dm debug stats], ~276m max cpu-usage [kubectl top pod -> app-server], ~16% max cpu-usage [grafana -> cluster])
* 2023-05-26b, SW: "Finished dev [unoptimized + debuginfo] target(s) in 21.98s" (341mb for new-layer, during heavy map-load: 40s to 3000subs [dm debug stats], ~365m max cpu-usage [kubectl top pod -> app-server], ~16% max cpu-usage [grafana -> cluster])

Timings (string-change, in-docker-debug, cranelift-msvc):
* 2023-05-26b, SW: "Finished dev [unoptimized + debuginfo] target(s) in 30.75s" (225mb for new-layer, during heavy map-load: 33s to 3000subs [dm debug stats], ~420m max cpu-usage [kubectl top pod -> app-server], ~20% max cpu-usage [grafana -> cluster])
* 2023-05-26b, SW: "Finished dev [unoptimized + debuginfo] target(s) in 26.57s" (225mb for new-layer, during heavy map-load: 40s to 3000subs [dm debug stats], ~410m max cpu-usage [kubectl top pod -> app-server], ~17% max cpu-usage [grafana -> cluster])
* 2023-05-26b, SW: "Finished dev [unoptimized + debuginfo] target(s) in 27.29s" (225mb for new-layer, during heavy map-load: 38s to 3000subs [dm debug stats], ~431m max cpu-usage [kubectl top pod -> app-server], ~18% max cpu-usage [grafana -> cluster])

Timings (string-change, in-docker-release, rustc):
* 2023-05-26b, SW: "Finished release [optimized] target(s) in 3m 54s"
* 2023-05-26b, SW: "Finished release [optimized] target(s) in 3m 59s" (46mb for new-layer, during heavy map-load: 45s to 3000subs [dm debug stats], ~142m max cpu-usage [kubectl top pod -> app-server], ~15% max cpu-usage [grafana -> cluster])
* 2023-05-26b, SW: "Finished release [optimized] target(s) in 4m 14s" (46mb for new-layer, during heavy map-load: 41s to 3000subs [dm debug stats], ~114m max cpu-usage [kubectl top pod -> app-server], ~12% max cpu-usage [grafana -> cluster])

Timings (string-change, in-docker-release, cranelift-msvc):
* 2023-05-26b, SW: "Finished release [optimized] target(s) in 2m 11s" (167mb for new-layer)
* 2023-05-26b, SW: "Finished release [optimized] target(s) in 2m 08s" (167mb for new-layer, during heavy map-load: ?s to 3000subs [dm debug stats], ~276m max cpu-usage [kubectl top pod -> app-server], ~15% max cpu-usage [grafana -> cluster])
* 2023-05-26b, SW: "Finished release [optimized] target(s) in 2m 06s" (167mb for new-layer, during heavy map-load: 42s to 3000subs [dm debug stats], ~334m max cpu-usage [kubectl top pod -> app-server], ~18% max cpu-usage [grafana -> cluster])
* 2023-05-26b, SW: "Finished release [optimized] target(s) in 2m 03s" (167mb for new-layer, during heavy map-load: 40s to 3000subs [dm debug stats], ~325m max cpu-usage [kubectl top pod -> app-server], ~18% max cpu-usage [grafana -> cluster])

# Frontend

* Path is currently: TypeScript [->tsc->] JS [->babel->] JS [->webpack->] js-bundle.
* Speed is alright, but could be improved. I'm planning to switch to Turbopack once it is ready for wider use.