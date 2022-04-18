# STAGE 1 (base-image: none)
# ==================================================
# ----------
	ARG RUST_BASE_URL
	#ARG RUST_BASE_URL=gcr.io/debate-map-prod/dm-rust-base
# ----------

# STAGE 2 (base-image: dm-rust-base)
# ==================================================
# ----------
	# see: ./Tiltfile (or source: Packages/deploy/@RustBase/Dockerfile)
	FROM $RUST_BASE_URL as cargo-build
	ARG env_ENV
	ARG debug_vs_release
	ARG debug_vs_release_flag
# ----------

# initial arg processing
ENV ENV=$env_ENV
RUN echo "Env:$ENV DebugVSRelease:$debug_vs_release"

# now copy the actual code for each relevant package
COPY Packages/rust-macros/ /dm_repo/Packages/rust-macros/
COPY Packages/rust-shared/ /dm_repo/Packages/rust-shared/
COPY Packages/app-server-rs/ /dm_repo/Packages/app-server-rs/
# ensure rust_shared was copied correctly
RUN echo rerun_flag_1 && cat /dm_repo/Packages/rust-shared/src/lib.rs

# now build everything
WORKDIR /dm_repo/Packages/app-server-rs
RUN RUSTC_BOOTSTRAP=1 cargo rustc ${debug_vs_release_flag} -- -Z time-passes
RUN mkdir -p ./kgetOutput_buildTime && (cp cargo-timing.html ./kgetOutput_buildTime/ || :) && (cp ./*profdata ./kgetOutput_buildTime/ || :)
# WORKDIR /dm_repo/
# RUN RUSTC_BOOTSTRAP=1 cargo build ${debug_vs_release_flag}

# STAGE 3 (base-image: debian)
# ==================================================
# ----------
	#FROM rust:1.58-slim-buster
	#FROM debian:buster-slim
	#FROM debian@sha256:f6e5cbc7eaaa232ae1db675d83eabfffdabeb9054515c15c2fb510da6bc618a7
	# use debian v12 (bookworm), because that is what our linker (mold) was built on [mold only has releases for debian v12+], which makes the produced binary require it as well
	FROM debian:bookworm-slim@sha256:5007b106fd828d768975b21cfdcecb51a8eeea9aab815a9e4a169acde464fb89
	ARG copy_from_path
# ----------

WORKDIR /dm_repo/Packages/app-server-rs

#COPY --from=cargo-build /dm_repo/Packages/app-server-rs/target/x86_64-unknown-linux-musl/release/app-server-rs .
#COPY --from=cargo-build /dm_repo/Packages/app-server-rs/target/x86_64-unknown-linux-musl/debug/app-server-rs .
#COPY --from=cargo-build /dm_repo/Packages/app-server-rs/target/debug/app-server-rs .
#COPY --from=cargo-build /dm_repo/target/debug/app-server-rs .
COPY --from=cargo-build ${copy_from_path} .
COPY --from=cargo-build /dm_repo/Packages/app-server-rs/kgetOutput_buildTime/ ./kgetOutput_buildTime/

# regular running
# ==========

CMD echo Starting Rust program...; \
#	./app-server-rs; \
	RUST_BACKTRACE=full ./app-server-rs; \
	sleep 1; echo Rust program crashed...
#	sleep 1; echo Rust program crashed...; sleep 123456789

# when you want to do memory-profiling
# ==========

# install heaptrack tool, for memory-usage profiling; and "ps" and such (see instructions below)
# RUN apt-get update && \
# 	apt-get -y install heaptrack && \
# 	apt-get -y install procps

# run the program, with heaptrack enabled
# CMD RUST_BACKTRACE=full heaptrack ./app-server-rs; sleep 123456789

# once running, and you've collected enough profiling data, do the following to view:
# 1) Find program's process-id: `ps aux --sort -rss`
# 2) Kill program: `kill -9 <pid>`
# 3) Copy the profiler-data to host computer: `kubectl cp dm-app-server-rs-XXX:/dm_repo/Packages/app-server-rs/heaptrack.app-server-rs.XXX.gz heaptrack.app-server-rs.XXX.gz`
# 4) If on Windows, install `heaptrack_gui` in linux-vm (eg. ubuntu desktop): `apt-get update && apt-get -y install heaptrack-gui`
# 5) Run heaptrack-gui: `heaptrack-gui PATH_TO_PROFILER_DATA`