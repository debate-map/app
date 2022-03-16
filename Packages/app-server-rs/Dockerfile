# ------------------------------------------------------------------------------
# Cargo Build Stage
# ------------------------------------------------------------------------------

#FROM rust:1.58 as cargo-build
# rather than use a mutable "version", lock the source image to a specific digest (so ~nightly "rust:XXX" image changes doesn't cause complete rebuilds of our build-chain)
FROM rust@sha256:fe410a9711ba354e2a27da5db5c1bcf2df50e63b8746b0f40fbb85878d60eb95 as cargo-build

# generic env-var for code to know if its running as part of a Dockerfile
ENV IN_DOCKER=1

RUN echo MoldInstall_Before2: $(date)

# install mold linker [works:181s]
# RUN apt-get update \
# 	&& apt-get install -y build-essential git clang cmake libstdc++-10-dev libssl-dev libxxhash-dev zlib1g-dev pkg-config \
# 	&& git clone https://github.com/rui314/mold.git \
# 	&& cd mold \
# 	&& git checkout v1.0.1 \
# 	&& make -j$(nproc) CXX=clang++ \
# 	&& make install

# install mold linker (from active apt-get repositories) # doesn't work (mold is not in debian 11's repository atm)
# RUN apt update
# RUN apt install mold
#for alpine: RUN apk add mold --repository=http://dl-cdn.alpinelinux.org/alpine/edge/testing

# install mold linker, from debian's SID (unstable) repository # first attempt; doesn't work
# RUN apt-get update \
# 	&& apt-get install mold --repository=http://http.us.debian.org/debian/

# install mold linker, from a direct URL (retrieved from here: https://debian.pkgs.org/sid/debian-main-amd64/mold_1.1.1+dfsg-1_amd64.deb.html) [doesn't work; dep issue]
# RUN TEMP_DEB="$(mktemp)" \
# 	&& wget -O "$TEMP_DEB" 'http://ftp.de.debian.org/debian/pool/main/m/mold/mold_1.1.1+dfsg-1_amd64.deb' \
# 	&& dpkg -i "$TEMP_DEB" \
# 	&& rm -f "$TEMP_DEB"

# install mold linker, from debian's SID (unstable) repository (mold is not in debian 11's repository atm) [works:72s]
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

RUN echo MoldInstall_After2: $(date)

# ensure mold is installed
RUN mold --version

#RUN apt-get update
#RUN apt-get install musl-tools -y
#RUN rustup target add x86_64-unknown-linux-musl

# we don't need cargo-expand for the cached_expand! macro; its gains are only a few seconds, which is great for dev-time cargo-check, but not worth it for docker builds
#RUN cargo install cargo-expand

#WORKDIR /dm_repo/Packages/app-server-rs
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

# just copy the rust-macros crate completely here (it doesn't change very often, so it's fine if it invalidates later steps)
COPY Packages/rust-macros Packages/rust-macros

COPY Packages/app-server-rs/Cargo.toml Packages/app-server-rs/Cargo.toml
# copy "dummy content" for the program (needed for Rust to build the dependencies, without having to rope in app-server's frequently changing own-code)
RUN mkdir Packages/app-server-rs/src/
RUN echo "fn main() { println!(\"if you see this, the build broke\"); }" > Packages/app-server-rs/src/main.rs

WORKDIR /dm_repo/Packages/app-server-rs

# build the dependencies
#RUN cargo build
#RUN RUSTC_BOOTSTRAP=1 cargo build -Z timings ${debug_vs_release_flag}
RUN RUSTC_BOOTSTRAP=1 cargo rustc -Z timings ${debug_vs_release_flag}
#RUN RUSTC_BOOTSTRAP=1 cargo rustc -- -Z self-profile -Z self-profile-events=default,args
# remove the build output of the "dummy version" of app_server_rs
#RUN rm -f target/debug/deps/app_server_rs*
RUN rm -f target/${debug_vs_release}/deps/app_server_rs*

# now copy the app-server's own code
#COPY Packages/app-server-rs/ .
COPY Packages/app-server-rs/ /dm_repo/Packages/app-server-rs/
#COPY Packages/rust-macros/ /dm_repo/Packages/rust-macros/
# and build the actual app-server program
#RUN cargo build
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

CMD echo Starting Rust program...; \
#	./app-server-rs; \
	RUST_BACKTRACE=full ./app-server-rs; \
	sleep 1; echo Rust program crashed...
#	sleep 1; echo Rust program crashed...; sleep 123456