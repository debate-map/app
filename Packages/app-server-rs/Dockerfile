# ------------------------------------------------------------------------------
# Cargo Build Stage
# ------------------------------------------------------------------------------

#FROM rust:1.58 as cargo-build
# rather than use a mutable "version", lock the source image to a specific digest (so ~nightly "rust:XXX" image changes doesn't cause complete rebuilds of our build-chain)
#FROM rust@sha256:fe410a9711ba354e2a27da5db5c1bcf2df50e63b8746b0f40fbb85878d60eb95 as cargo-build
# temp, to be (closer to) matching with cargo 1.60.0-beta.3 on dev-machine
FROM rustlang/rust:nightly-bullseye@sha256:80046c08dad9ac3941941be072ea5db5c105a6208cff73ca36496f761c2f5c9c as cargo-build

# generic env-var for code to know if its running as part of a Dockerfile
ENV IN_DOCKER=1

# install mold linker [works:181s]
# RUN apt-get update \
# 	&& apt-get install -y build-essential git clang cmake libstdc++-10-dev libssl-dev libxxhash-dev zlib1g-dev pkg-config \
# 	&& git clone https://github.com/rui314/mold.git \
# 	&& cd mold \
# 	&& git checkout v1.0.1 \
# 	&& make -j$(nproc) CXX=clang++ \
# 	&& make install

# install mold linker, from debian's v12 "sid/unstable" repository (mold is not in debian [10/11]'s repository atm) [works:72s]
RUN apt-get update && \
	# install some things needed by mold (at mold run-time)
	#apt-get -y install build-essential git clang cmake libstdc++-10-dev libssl-dev libxxhash-dev zlib1g-dev pkg-config && \
	apt-get -y install clang && \
	# install mold
	apt-get -y --no-install-recommends install software-properties-common && \
	#apt-get -y install software-properties-common && \
	add-apt-repository "deb http://httpredir.debian.org/debian sid main" && \
	apt-get update && \
	apt-get -t sid install -y --no-install-recommends mold
	#apt-get -t sid install -y mold

# ensure mold is installed
RUN mold --version

WORKDIR /dm_repo

# args
ARG env_ENV
ARG debug_vs_release
ARG debug_vs_release_flag
# arg initial handling
ENV ENV=$env_ENV
RUN echo "Env:$ENV DebugVSRelease:$debug_vs_release"

# this makes-so cargo-build and such uses mold as its linker
COPY .cargo/config.toml .cargo/config.toml
# this makes-so the cargo-build commands ignore warnings in their output (warnings in own code should be noticed/resolved through VSCode squigglies, not clutter in build-output)
#ENV RUSTFLAGS=-Awarnings # moved to config.toml (we cannot set RUSTFLAGS from multiple places, so chose config.toml as the location for now)
# this sets the debugging-info granularity to "per line", rather than the default "2" which is more detailed; this speeds up builds a bit 
ENV CARGO_PROFILE_DEV_DEBUG=1

# cargo's "update crates.io index" step is slow; cache that step in its own layer
#RUN cd ~/.cargo/registry/index/github.com-1ecc6299db9ec823 && git fetch
RUN USER=root cargo new --bin update-index-helper
WORKDIR /dm_repo/update-index-helper
# add one tiny dependency (with no subdeps), so cargo-build updates the index
RUN echo "void = \"1\"" >> Cargo.toml
#RUN RUSTC_BOOTSTRAP=1 cargo build ${debug_vs_release_flag}
RUN RUSTC_BOOTSTRAP=1 cargo rustc ${debug_vs_release_flag}

WORKDIR /dm_repo
COPY Cargo.toml Cargo.toml
COPY Cargo.lock Cargo.lock

# when building app-server-rs, we don't care about the other Rust pod codebases; replace their entries in the root Cargo.toml (sed syntax: https://askubuntu.com/a/20416)
RUN sed -i 's~"Packages/monitor-backend",~~g' Cargo.toml

# just copy the rust-macros crate completely here (it doesn't change very often, so it's fine if it invalidates later steps)
COPY Packages/rust-macros Packages/rust-macros

COPY Packages/rust-shared/Cargo.toml Packages/rust-shared/Cargo.toml
# copy "dummy content" for the program (needed for Rust to build the dependencies, without having to rope in rust-shared's frequently changing own-code)
RUN mkdir Packages/rust-shared/src/
RUN echo "fn main() { println!(\"if you see this, the build broke\"); }" > Packages/rust-shared/src/lib.rs

COPY Packages/app-server-rs/Cargo.toml Packages/app-server-rs/Cargo.toml
# copy "dummy content" for the program (needed for Rust to build the dependencies, without having to rope in app-server's frequently changing own-code)
RUN mkdir Packages/app-server-rs/src/
RUN echo "fn main() { println!(\"if you see this, the build broke\"); }" > Packages/app-server-rs/src/main.rs

WORKDIR /dm_repo/Packages/app-server-rs

# build the dependencies
#RUN RUSTC_BOOTSTRAP=1 cargo build -Z timings ${debug_vs_release_flag}
RUN RUSTC_BOOTSTRAP=1 cargo rustc -Z timings ${debug_vs_release_flag}
#RUN RUSTC_BOOTSTRAP=1 cargo rustc -- -Z self-profile -Z self-profile-events=default,args

# remove the build output of the "dummy versions" of packages (needed for subsequent compile)
#RUN rm -f /dm_repo/Packages/app-server-rs/target/${debug_vs_release}/deps/app_server_rs*
RUN rm -f /dm_repo/target/${debug_vs_release}/deps/rust_shared*
RUN rm -f /dm_repo/target/${debug_vs_release}/deps/app_server_rs*

# now copy the actual code for rust-shared, and build it
COPY Packages/rust-shared/ /dm_repo/Packages/rust-shared/
RUN cat /dm_repo/Packages/rust-shared/src/lib.rs
RUN cd /dm_repo/Packages/rust-shared/ && RUSTC_BOOTSTRAP=1 cargo rustc ${debug_vs_release_flag} -- -Z time-passes

# now copy the actual code for app-server-rs, and build it
#COPY Packages/app-server-rs/ .
COPY Packages/app-server-rs/ /dm_repo/Packages/app-server-rs/
#COPY Packages/rust-macros/ /dm_repo/Packages/rust-macros/
# and build the actual app-server program
#RUN RUSTC_BOOTSTRAP=1 cargo build -Z timings
#RUN RUSTC_BOOTSTRAP=1 cargo build ${debug_vs_release_flag}
RUN RUSTC_BOOTSTRAP=1 cargo rustc ${debug_vs_release_flag} -- -Z time-passes
#RUN RUSTC_BOOTSTRAP=1 cargo rustc -- -Z time-passes
#RUN RUSTC_BOOTSTRAP=1 cargo rustc -- -Z time-passes -Z self-profile -Z self-profile-events=default,args
RUN mkdir -p ./kgetOutput_buildTime && (cp cargo-timing.html ./kgetOutput_buildTime/ || :) && (cp ./*profdata ./kgetOutput_buildTime/ || :)

# ------------------------------------------------------------------------------
# Final Stage
# ------------------------------------------------------------------------------

#FROM rust:1.58-slim-buster
#FROM debian:buster-slim
#FROM debian@sha256:f6e5cbc7eaaa232ae1db675d83eabfffdabeb9054515c15c2fb510da6bc618a7
# use debian v12 (bookworm), because that is what our linker (mold) was built on [mold only has releases for debian v12+], which makes the produced binary require it as well
FROM debian:bookworm-slim

# args
ARG copy_from_path

WORKDIR /dm_repo/Packages/app-server-rs

#COPY --from=cargo-build /dm_repo/Packages/app-server-rs/target/x86_64-unknown-linux-musl/release/app-server-rs .
#COPY --from=cargo-build /dm_repo/Packages/app-server-rs/target/x86_64-unknown-linux-musl/debug/app-server-rs .
#COPY --from=cargo-build /dm_repo/Packages/app-server-rs/target/debug/app-server-rs .
#COPY --from=cargo-build /dm_repo/target/debug/app-server-rs .
COPY --from=cargo-build ${copy_from_path} .
COPY --from=cargo-build /dm_repo/Packages/app-server-rs/kgetOutput_buildTime/ ./kgetOutput_buildTime/

# regular running
# ==========

# CMD echo Starting Rust program...; \
# #	./app-server-rs; \
# 	RUST_BACKTRACE=full ./app-server-rs; \
# 	sleep 1; echo Rust program crashed...
# #	sleep 1; echo Rust program crashed...; sleep 123456789

# when you want to do memory-profiling
# ==========

# install heaptrack tool, for memory-usage profiling; and "ps" and such (see instructions below)
RUN apt-get update && \
	apt-get -y install heaptrack && \
	apt-get -y install procps

CMD RUST_BACKTRACE=full heaptrack ./app-server-rs; sleep 123456789

# once running, and you've collected enough profiling data, do the following to view:
# 1) Find program's process-id: `ps aux --sort -rss`
# 2) Kill program: `kill -9 <pid>`
# 3) Copy the profiler-data to host computer: `kubectl cp dm-app-server-rs-XXX:/dm_repo/Packages/app-server-rs/heaptrack.app-server-rs.XXX.gz heaptrack.app-server-rs.XXX.gz`
# 4) If on Windows, install `heaptrack_gui` in linux-vm (eg. ubuntu desktop): `apt-get update && apt-get -y install heaptrack-gui`
# 5) Run heaptrack-gui: `heaptrack-gui PATH_TO_PROFILER_DATA`