# ------------------------------------------------------------------------------
# Cargo Build Stage
# ------------------------------------------------------------------------------

#FROM rust:1.58 as cargo-build
# rather than use a mutable "version", lock the source image to a specific digest (so ~nightly "rust:XXX" image changes doesn't cause complete rebuilds of our build-chain)
FROM rust@sha256:fe410a9711ba354e2a27da5db5c1bcf2df50e63b8746b0f40fbb85878d60eb95 as cargo-build

# generic env-var for code to know if its running as part of a Dockerfile
ENV IN_DOCKER=1

# install mold linker, from debian's v12 "sid/unstable" repository (mold is not in debian [10/11]'s repository atm) [works:72s]
RUN apt-get update && \
	# install some things needed by mold (at mold run-time)
	apt-get -y install clang && \
	# install mold
	apt-get -y --no-install-recommends install software-properties-common && \
	add-apt-repository "deb http://httpredir.debian.org/debian sid main" && \
	apt-get update && \
	apt-get -t sid install -y --no-install-recommends mold

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
# this sets the debugging-info granularity to "per line", rather than the default "2" which is more detailed; this speeds up builds a bit 
ENV CARGO_PROFILE_DEV_DEBUG=1

# cargo's "update crates.io index" step is slow; cache that step in its own layer
RUN USER=root cargo new --bin update-index-helper
WORKDIR /dm_repo/update-index-helper
# add one tiny dependency (with no subdeps), so cargo-build updates the index
RUN echo "void = \"1\"" >> Cargo.toml
RUN RUSTC_BOOTSTRAP=1 cargo rustc ${debug_vs_release_flag}

WORKDIR /dm_repo
COPY Cargo.toml Cargo.toml
COPY Cargo.lock Cargo.lock

# just copy the rust-macros crate completely here (it doesn't change very often, so it's fine if it invalidates later steps)
COPY Packages/rust-macros Packages/rust-macros

COPY Packages/monitor-backend/Cargo.toml Packages/monitor-backend/Cargo.toml
# copy "dummy content" for the program (needed for Rust to build the dependencies, without having to rope in app-server's frequently changing own-code)
RUN mkdir Packages/monitor-backend/src/
RUN echo "fn main() { println!(\"if you see this, the build broke\"); }" > Packages/monitor-backend/src/main.rs

WORKDIR /dm_repo/Packages/monitor-backend

# build the dependencies
RUN RUSTC_BOOTSTRAP=1 cargo rustc -Z timings ${debug_vs_release_flag}
# remove the build output of the "dummy version" of monitor_backend
RUN rm -f target/${debug_vs_release}/deps/monitor_backend*

# now copy the monitor-backend's own code
COPY Packages/monitor-backend/ /dm_repo/Packages/monitor-backend/
RUN RUSTC_BOOTSTRAP=1 cargo rustc ${debug_vs_release_flag} -- -Z time-passes
RUN mkdir -p ./kgetOutput_buildTime && (cp cargo-timing.html ./kgetOutput_buildTime/ || :) && (cp ./*profdata ./kgetOutput_buildTime/ || :)

# ------------------------------------------------------------------------------
# Final Stage
# ------------------------------------------------------------------------------

# use debian v12 (bookworm), because that is what our linker (mold) was built on [mold only has releases for debian v12+], which makes the produced binary require it as well
FROM debian:bookworm-slim

# args
ARG copy_from_path

WORKDIR /dm_repo/Packages/monitor-backend

COPY --from=cargo-build ${copy_from_path} .
COPY --from=cargo-build /dm_repo/Packages/monitor-backend/kgetOutput_buildTime/ ./kgetOutput_buildTime/

CMD echo Starting Rust program...; \
	RUST_BACKTRACE=full ./monitor-backend; \
	sleep 1; echo Rust program crashed...