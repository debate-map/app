# STAGE 1 (base-image: rust)
# ==================================================
# ----------
	#FROM rust:1.58 as cargo-build
	# rather than use a mutable "version", lock the source image to a specific digest (so ~nightly "rust:XXX" image changes doesn't cause complete rebuilds of our build-chain)
	#FROM rust@sha256:fe410a9711ba354e2a27da5db5c1bcf2df50e63b8746b0f40fbb85878d60eb95 as cargo-build
	# temp, to be (closer to) matching with cargo 1.60.0-beta.3 on dev-machine
	#FROM rustlang/rust:nightly-bullseye@sha256:80046c08dad9ac3941941be072ea5db5c105a6208cff73ca36496f761c2f5c9c

	# We kind of want to use nightly here (to match with rust-toolchain.toml, due to use of feature flags), but that means basing on rust-nightly, which is not a "stable" image
	#     (eg. it can change at any time [currently every 24 hours], and we don't want to rebuild our build-chain every time it does; see here: https://github.com/rust-lang/docker-rust-nightly/issues/3).
	#FROM rust:1.65.0-bullseye

	# Nevermind, the image below exists as a mirror of rust-nightly, and lets us pin to a specific nightly. (so we don't rebuild our build-chain every time rust-nightly changes)
	FROM instrumentisto/rust:nightly-bullseye-2022-12-07

	ARG env_ENV
	ARG debug_vs_release
	ARG debug_vs_release_flag
# ----------

# initial arg processing
ENV ENV=$env_ENV
RUN echo "Env:$ENV DebugVSRelease:$debug_vs_release"

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
# also install various other commands (eg. for inspecting folder-structure during build)
RUN apt-get install -y tree

# ensure mold is installed
RUN mold --version

WORKDIR /dm_repo

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
#RUN RUSTC_BOOTSTRAP=1 cargo rustc ${debug_vs_release_flag}
RUN cargo rustc ${debug_vs_release_flag}

WORKDIR /dm_repo
COPY Cargo.toml Cargo.toml
COPY Cargo.lock Cargo.lock