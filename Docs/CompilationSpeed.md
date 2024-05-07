# Backend (Rust)

Notes:
* If you're benchmarking, and you've just changed the compiler config, some things to keep in mind:
	* 1\) It's recommended to clear the docker cache-mounts (ie. Rust's compilation cache across docker builds) before the benchmark compilation, to ensure no side-effects from previous builds (it seems that sometimes old cache is "partially used" and can change the size/build-times, or cause compile/runtime errors). To do so, run: `docker builder prune --filter type=exec.cachemount`
	* 2\) While the solid majority of the time it's sufficient to simply press "Trigger update" on dm-app-server in the tilt-ui, there is a strange issue that can happen on occasion, where docker starts (and then keeps) building using an old compilation config (even after clearing the cache-mounts). It happens rarely enough to not be worth major investigation, but if you notice/suspect that it has happened, restarting the tilt-up process seems to resolve it (maybe relating somehow to another pod having been the one to first build the rust-shared image). [Note that it's *possible* this may give different "clean compile times" then when having just the target (app-server) pod be compiled due to lock-waiting between the pods (unconfirmed) -- so for now, obtain clean-build compile timings without this full-tilt-reset involved.]

Descriptions of shortened terms/phrases:
* Developer machines:
	* sw1\) OS: Windows 10, CPU: Ryzen 7 1700X, RAM: 32gb (Stephen Wicklund's desktop)
	* sw2\) OS: Linux Mint, CPU: AMD Ryzen 7 PRO 7840U, RAM: 64gb (Stephen Wicklund's laptop)
* Build contexts: host = host OS (no docker), dd = Docker Desktop, rd = Rancher Desktop, de = docker engine
* The compile-times listed are always the number printed by cargo itself. (ie. the XX [floored] in `"Finished dev [...] target(s) in XX.??s"`)
* The "size" column is for the size of the `app-server-binary` output, as printed using `ls -lh app-server-binary` at end of `Dockerfile`. (if there is a question mark after the size, it's an approximation based on docker layer size, at ~4mb larger than the binary)
* Build freshness/caching options: clean(noIncr), clean(incr), str(noIncr), str(incr)
	* Clean = build done just after "cargo clean". Str = build done just after adding one character to first println in `main` function of `Packages/app-server/src/main.rs`. NoIncr/Incr = Build done with cargo compile option `incremental` set (or defaulting) to `false` or `true` (respectively).
* General sorting philosophy: sort by column 1, then column 2, etc., with (generally) the "slowest" options in each column sorted to the top. (at least what was *expected* to be the fastest, eg. dev build-configs are always ordered after release ones, even though certain release configs outpace certain dev configs).

## App-server compile timings

| Caching       | Profile (deps+app) | Linker | Date          | Size      | Compile timings (line per machine + build-env) |
| -             | -             | -       | -                 | -         | - |
| clean(noIncr) | r:llvm3       | default | 2024-05-06        | 45mb      | sw1(dd): 6m27s |
| clean(incr)   | r:llvm3+clif3 | default | 2024-05-06        | 100mb     | sw2(de): 2m2s, 2m8s |
| str(noIncr)   | r:llvm3       | default | 2024-05-01 [->06] | 45mb      | sw1(dd): 3m22s, 3m21s <br> sw2(rd): 3m47s, 3m44s <br> sw2(de): 1m47s, 1m47s, 1m50s, 1m49s |
| str(noIncr)   | r:llvm3       | lld     | 2024-05-04        | ?         | sw2(de): 1m53s, 1m53s, 1m51s |
| str(noIncr)   | r:llvm3       | mold    | 2024-05-03        | ?         | sw2(de): 1m43s, 1m43s |
| str(noIncr)   | r:llvm3+clif3 | default | 2024-05-05        | 97mb      | sw2(de): 33s, 35s, 34s |
| str(noIncr)   | r:llvm3+clif0 | default | 2024-05-05        | 78mb      | sw2(de): 32s, 31s |
| str(incr)     | r:llvm3+clif3 | default | 2024-05-05 [->06] | 100mb     | sw1(dd): 24s, 22s, 21s <br> sw2(de): 14s, 13s, 13s, 13s |
| str(incr)     | r:llvm3+clif3 | lld     | 2024-05-06        | 106-125mb | sw2(de): 10s, 10s, 10s |
| str(incr)     | r:llvm3+clif3 | mold    | 2024-05-06        | 125mb     | sw1(dd): 19s, 18s, 19s <br> sw2(de): 10s, 10s, 10s |
| str(incr)     | d:llvm0       | default | 2024-05-05 [->07] | 254mb     | sw1(dd): 38s, 40s, 40s <br> sw2(de): 19s, 20s, 20s |
| str(incr)     | d:llvm0+clif0 | default | 2024-05-07        | 208mb     | sw1(dd): 28s, 29s, 27s, 29s |
| str(incr)     | d:llvm3+clif0 | default | 2024-05-07        | 207mb     | sw1(dd): 21s, 20s, 21s, 21s |
| str(incr)     | d:clif0       | default | 2024-05-05 [->07] | 219mb     | sw1(dd): 21s, 23s, 21s, 22s <br> sw2(de): 12s, 12s ([err](## "Note that this row's build config errors at runtime atm: trap at Instance [...] core_arch::x86::sha::_mm_sha1rnds4_epu32 [...] llvm.x86.sha1rnds4")) |

<details><summary><b>Archived timings (outdated, config now irrelevant, etc.)</b></summary>

| Caching       | Profile (deps+app) | Linker | Date        | Size      | Compile timings (line per machine + build-env) |
| -             | -             | -       | -               | -         | - |
| ?             | d:llvm0       | default | 2023-05-26      | ?         | sw1(ho): 7m01s, 5m19s, 5m11s |
| ?             | d:llvm0       | mold    | 2023-05-26      | ?         | sw1(dd): 2m39s, 2m50s |
| ?             | d:clif0       | default | 2023-05-26      | ?         | sw1(ho): 5m55s, 4m25s |
| ?             | d:clif0       | mold    | 2023-05-26      | ?         | sw1(dd): 4m15s, 2m02s, 1m56s |
| ?             | r:llvm3       | default | 2023-05-26      | ?         | sw1(ho): 9m47s, 8m21s |
| ?             | r:llvm3       | mold    | 2023-05-26      | ?         | sw1(dd): 7m25s, 8m53s |
| ?             | r:clif3       | default | 2023-05-26      | ?         | sw1(ho): 5m05s, 4m03s |
| ?             | r:clif3       | mold    | 2023-05-26      | ?         | sw1(dd): 4m00s, 3m35s, 2m04s |
| str(noIncr)   | r:llvm3       | mold    | 2023-05-26      | ~46mb     | sw1(dd): 3m54s, 3m59s, 4m14s ([perf](## "during heavy map-load: 45s,41s to 3000subs [dm debug stats], ~142m,~114m max cpu-usage [kubectl top pod -> app-server], ~15%,~12% max cpu-usage [grafana -> cluster]")) |
| str(noIncr)   | r:clif3       | mold    | 2023-05-26      | ~167mb    | sw1(dd): 2m11s, 2m8s, 2m6s, 2m3s ([perf](## "during heavy map-load: ?,?,42s,40s to 3000subs [dm debug stats], ?,~276m,~334m,~325m max cpu-usage [kubectl top pod -> app-server], ?,~15%,~18%,~18% max cpu-usage [grafana -> cluster]")) |
| str(incr)     | d:llvm0       | mold    | 2023-05-26      | ~341mb    | sw1(ho): 1m01s, 46s <br> sw1(dd): 23s, 24s, 21s ([perf](## "during heavy map-load: 51s,50s,40s to 3000subs [dm debug stats], ~248m,~276m,~365m max cpu-usage [kubectl top pod -> app-server], ~15%,16%,16% max cpu-usage [grafana -> cluster]")) |
| str(incr)     | d:clif0       | mold    | 2023-05-26      | ~225mb    | sw1(ho): 37s, 49s <br> sw1(dd): 30s, 26s, 27s ([perf](## "during heavy map-load: 33s,40s,38s to 3000subs [dm debug stats], ~420m,~410m,~431m max cpu-usage [kubectl top pod -> app-server], ~20%,~17%,~18% max cpu-usage [grafana -> cluster]")) |

</details>

# Frontend

* Path is currently: TypeScript [->tsc->] JS [->babel->] JS [->webpack->] js-bundle.
* Speed is alright, but could be improved. I'm planning to switch to Turbopack once it is ready for wider use.