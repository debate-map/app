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
	ARG copy_from_path
# ----------

# initial arg processing
WORKDIR "/dm_repo"
ENV ENV=$env_ENV
RUN echo "Env:$ENV DebugVSRelease:$debug_vs_release"

# copy the shared packages
COPY Packages/rust-macros/ /dm_repo/Packages/rust-macros/
COPY Packages/rust-shared/ /dm_repo/Packages/rust-shared/

# copy this package
COPY Packages/app-server/ /dm_repo/Packages/app-server/

# copy "dummy content" for each other non-shared package (needed for Rust to build the dependencies, without having to rope in the changing own-code of each package)
COPY Packages/monitor-backend/Cargo.toml Packages/monitor-backend/Cargo.toml
RUN mkdir Packages/monitor-backend/src/
RUN echo "fn main() { println!(\"if you see this, the build broke\"); }" > Packages/monitor-backend/src/main.rs
COPY Packages/web-server/Cargo.toml Packages/web-server/Cargo.toml
RUN mkdir Packages/web-server/src/
RUN echo "fn main() { println!(\"if you see this, the build broke\"); }" > Packages/web-server/src/main.rs

# now build everything
WORKDIR /dm_repo/Packages/app-server
# to clear the cache below (and all other mount-caches), run: docker builder prune --filter type=exec.cachemount
#RUN --mount=type=cache,target=/usr/local/cargo,from=dm-rust-base,source=/usr/local/cargo \
RUN --mount=type=cache,target=/usr/local/cargo,from=rust,source=/usr/local/cargo \
	--mount=type=cache,target=/dm_repo/target \
#	RUSTC_BOOTSTRAP=1 cargo rustc ${debug_vs_release_flag} -- -Z time-passes
#	RUSTC_BOOTSTRAP=1 cargo build --timings ${debug_vs_release_flag} && \
	cargo build --timings ${debug_vs_release_flag} && \
	# move binary out of target folder, else will stay in cache volume and be inaccessible in later steps
	mv ${copy_from_path} /dm_repo/Packages/app-server/app-server-binary

RUN mkdir -p ./kgetOutput_buildTime && (cp cargo-timing.html ./kgetOutput_buildTime/ || :) && (cp ./*profdata ./kgetOutput_buildTime/ || :)

# STAGE 3 (base-image: debian)
# ==================================================
# ----------
	#FROM rust:1.58-slim-buster
	#FROM debian:buster-slim
	#FROM debian@sha256:f6e5cbc7eaaa232ae1db675d83eabfffdabeb9054515c15c2fb510da6bc618a7
	# use debian v12 (bookworm), because that is what our linker (mold) was built on [mold only has releases for debian v12+], which makes the produced binary require it as well
	#FROM debian:bookworm-slim@sha256:5007b106fd828d768975b21cfdcecb51a8eeea9aab815a9e4a169acde464fb89
	FROM debian:bookworm-20221114-slim
	ARG env_ENV
# ----------

WORKDIR /dm_repo/Packages/app-server
ENV ENV=$env_ENV

# temp (for ssl connections; will look for cleaner way soon)
#RUN apt-get update && apt-get install -y ca-certificates

# add postgres-client; this is needed for app-server to run `db_dump`, for its `getDBDump` endpoint # edit: hit issues; going the k8s "pods/exec" route instead
# RUN echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" >>  /etc/apt/sources.list.d/pgdg.list
# RUN sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
# RUN apt-get update && RUN apt-get install wget ca-certificates
# RUN wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
# RUN apt-get update && apt-get install postgresql-client

COPY --from=cargo-build /dm_repo/Packages/app-server/app-server-binary .
COPY --from=cargo-build /dm_repo/Packages/app-server/kgetOutput_buildTime/ ./kgetOutput_buildTime/

# other files needed
COPY .env .

# check binary size
RUN ls -lh app-server-binary

# regular running
# ==========

CMD echo Starting Rust program...; \
	RUST_BACKTRACE=full ./app-server-binary; \
	sleep 1; echo Rust program crashed...
#	sleep 1; echo Rust program crashed...; sleep 123456789

# when you want to do memory-profiling
# ==========

# install heaptrack tool, for memory-usage profiling; and "ps" and such (see instructions below)
# RUN apt-get update && \
# 	apt-get -y install heaptrack && \
# 	apt-get -y install procps

# run the program, with heaptrack enabled
# CMD RUST_BACKTRACE=full heaptrack ./app-server; sleep 123456789

# once running, and you've collected enough profiling data, do the following to view:
# 1) Find program's process-id: `ps aux --sort -rss`
# 2) Kill program: `kill -9 <pid>`
# 3) Copy the profiler-data to host computer: `kubectl cp dm-app-server-XXX:/dm_repo/Packages/app-server/heaptrack.app-server.XXX.gz heaptrack.app-server.XXX.gz`
# 4) If on Windows, install `heaptrack_gui` in linux-vm (eg. ubuntu desktop): `apt-get update && apt-get -y install heaptrack-gui`
# 5) Run heaptrack-gui: `heaptrack-gui PATH_TO_PROFILER_DATA`