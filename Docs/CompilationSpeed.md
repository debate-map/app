# Backend (Rust)

Shortenings:
* "string-change": simply added an extra character to a string in the file `Packages/app-server/src/main.rs`. (first println in `main` function)
* "SW": Stephen Wicklund (aka Venryx) [number after SW indicates which of my computers; SW1=desktop, SW12=laptop]

## Fresh

Timings (fresh, debug, rustc): ["Finished dev [unoptimized + debuginfo] target(s) in XXX"]
* 2023-05-26, SW1: 7m01s
* 2023-05-26, SW1 (likely not all fresh): 5m19s, 5m11s

Timings (fresh, debug, cranelift-msvc): ["Finished dev [unoptimized + debuginfo] target(s) in XXX"]
* 2023-05-26, SW1 (likely not all fresh): 5m55s, 4m25s

Timings (fresh, release, rustc): ["Finished release [optimized] target(s) in XXX"]
* 2023-05-26, SW1 (likely not all fresh; had debug-build artifacts present): 9m47s, 8m21s

Timings (fresh, release, cranelift-msvc): ["Finished release [optimized] target(s) in XXX"]
* 2023-05-26, SW1 (likely not all fresh; had debug-build artifacts present): 5m05s, 4m03s

### In docker

Timings (fresh, in-docker-debug, rustc): ["Finished dev [unoptimized + debuginfo] target(s) in XXX"]
* 2023-05-26, SW1 (likely not all fresh; likely read from cache-mount): 2m39s, 2m50s

Timings (fresh, in-docker-debug, cranelift-msvc): ["Finished dev [unoptimized + debuginfo] target(s) in XXX"]
* 2023-05-26, SW1 (likely not all fresh; likely read from cache-mount): 4m15s, 2m02s, 1m56s

Timings (fresh, in-docker-release, rustc): ["Finished release [optimized] target(s) in XXX"]
* 2023-05-26, SW1 (likely not all fresh; likely read from cache-mount): 7m25s, 8m53s

Timings (fresh, in-docker-release, cranelift-msvc): ["Finished release [optimized] target(s) in XXX"]
* 2023-05-26, SW1 (likely not all fresh; likely read from cache-mount): 4m00s, 3m35s, 2m04s

## Incremental

Timings (string-change, debug, rustc): "Finished dev [unoptimized + debuginfo] target(s) in XXX"
* 2023-05-26, SW1: 1m01s,46.14s

Timings (string-change, debug, cranelift-msvc): ["Finished dev [unoptimized + debuginfo] target(s) in XXX"]
* 2023-05-26, SW1: 37.36s, 49.32s

Timings (string-change, release, rustc): TODO
Timings (string-change, release, cranelift-msvc): TODO

### In docker

Timings (string-change, docker-desktop, debug, rustc): ["Finished dev [unoptimized + debuginfo] target(s) in XXX"]
* 2023-05-26, SW1: 23.82s, 24.49s, 21.98s (341mb for new-layer, during heavy map-load: 51s,50s,40s to 3000subs [dm debug stats], ~248m,~276m,~365m max cpu-usage [kubectl top pod -> app-server], ~15%,16%,16% max cpu-usage [grafana -> cluster])

Timings (string-change, docker-desktop, debug, cranelift-msvc): ["Finished dev [unoptimized + debuginfo] target(s) in XXX"]
* 2023-05-26, SW1: 30.75s, 26.57s, 27.29s (225mb for new-layer, during heavy map-load: 33s,40s,38s to 3000subs [dm debug stats], ~420m,~410m,~431m max cpu-usage [kubectl top pod -> app-server], ~20%,~17%,~18% max cpu-usage [grafana -> cluster])

Timings (string-change, docker-desktop, release, rustc): ["Finished release [optimized] target(s) in XXX"]
* 2023-05-26, SW1: 3m54s, 3m59s, 4m14s (46mb for new-layer, during heavy map-load: 45s,41s to 3000subs [dm debug stats], ~142m,~114m max cpu-usage [kubectl top pod -> app-server], ~15%,~12% max cpu-usage [grafana -> cluster])
* 2024-05-01, SW2: 3m47s, 3m44s [actually, I think this timing may have been when using rancher-desktop...]

Timings (string-change, docker-engine, release, rustc): ["Finished release [optimized] target(s) in XXX"]
* 2024-05-03, SW2: 1m43s, 1m43s

Timings (string-change, docker-desktop, release, cranelift-msvc): ["Finished release [optimized] target(s) in XXX"]
* 2023-05-26, SW1: 2m11s,2m8s,2m6s,2m3s (167mb for new-layer, during heavy map-load: ?,?,42s,40s to 3000subs [dm debug stats], ?,~276m,~334m,~325m max cpu-usage [kubectl top pod -> app-server], ?,~15%,~18%,~18% max cpu-usage [grafana -> cluster])

# Frontend

* Path is currently: TypeScript [->tsc->] JS [->babel->] JS [->webpack->] js-bundle.
* Speed is alright, but could be improved. I'm planning to switch to Turbopack once it is ready for wider use.