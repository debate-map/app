# STAGE 1 (base-image: rust)
# ==================================================
# ----------
	#FROM rust:1.58 as cargo-build
	# rather than use a mutable "version", lock the source image to a specific digest (so ~nightly "rust:XXX" image changes doesn't cause complete rebuilds of our build-chain)
	#FROM rust@sha256:fe410a9711ba354e2a27da5db5c1bcf2df50e63b8746b0f40fbb85878d60eb95 as cargo-build
	# temp, to be (closer to) matching with cargo 1.60.0-beta.3 on dev-machine
	FROM rustlang/rust:nightly-bullseye@sha256:80046c08dad9ac3941941be072ea5db5c105a6208cff73ca36496f761c2f5c9c
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
RUN RUSTC_BOOTSTRAP=1 cargo rustc ${debug_vs_release_flag}

WORKDIR /dm_repo
COPY Cargo.toml Cargo.toml
COPY Cargo.lock Cargo.lock

# when building app-server-rs, we don't care about the other Rust pod codebases; replace their entries in the root Cargo.toml (sed syntax: https://askubuntu.com/a/20416)
#RUN sed -i 's~"Packages/monitor-backend",~~g' Cargo.toml

COPY Packages/rust-macros/Cargo.toml Packages/rust-macros/Cargo.toml
COPY Packages/rust-shared/Cargo.toml Packages/rust-shared/Cargo.toml
COPY Packages/app-server-rs/Cargo.toml Packages/app-server-rs/Cargo.toml
COPY Packages/monitor-backend/Cargo.toml Packages/monitor-backend/Cargo.toml

# attempt 1, part 1: rust-macros is a proc-macro crate, which has special handling during compilation; disable that special handling (at this placeholder-stage), by stripping that field (sed syntax: https://askubuntu.com/a/20416)
#RUN sed -i 's~proc-macro = true~~g' Cargo.toml

# copy "dummy content" for each of the packages (needed for Rust to build the dependencies, without having to rope in the changing own-code of each package)
RUN mkdir Packages/rust-macros/src/
RUN mkdir Packages/rust-shared/src/
RUN mkdir Packages/app-server-rs/src/
RUN mkdir Packages/monitor-backend/src/
RUN echo "fn main() { println!(\"if you see this, the build broke\"); }" > Packages/rust-macros/src/lib.rs
RUN echo "fn main() { println!(\"if you see this, the build broke\"); }" > Packages/rust-shared/src/lib.rs
RUN echo "fn main() { println!(\"if you see this, the build broke\"); }" > Packages/app-server-rs/src/main.rs
RUN echo "fn main() { println!(\"if you see this, the build broke\"); }" > Packages/monitor-backend/src/main.rs

# attempt 2: just copy rust-macros verbatim for now; this means everything will need a rebuild, but I haven't been able to find an alternative atm
COPY Packages/rust-macros/ Packages/rust-macros/

# build the dependencies
RUN RUSTC_BOOTSTRAP=1 cargo build --timings ${debug_vs_release_flag}
#RUN RUSTC_BOOTSTRAP=1 cargo rustc -Z timings ${debug_vs_release_flag}
#RUN RUSTC_BOOTSTRAP=1 cargo rustc -- -Z self-profile -Z self-profile-events=default,args

# list all paths under "target" that contain "macros" or "shared"
RUN cd /dm_repo/target && tree -fa | grep -E '(macros|shared)'
#RUN echo rerun_flag_0 && ls /dm_repo/Packages/app-server-rs
#RUN echo rerun_flag_1 && ls /dm_repo/target/${debug_vs_release}
#RUN echo rerun_flag_1 && ls /dm_repo/target/${debug_vs_release}/build
#RUN echo rerun_flag_1 && ls /dm_repo/target/${debug_vs_release}/deps
#RUN echo rerun_flag_1 && ls /dm_repo/target/${debug_vs_release}/incremental

# remove the build output of the "dummy versions" of packages (needed for subsequent compile)
#RUN rm -f /dm_repo/Packages/app-server-rs/target/${debug_vs_release}/deps/app_server_rs*
RUN echo clearing_placeholder_build_data_1 && \
	rm -f /dm_repo/target/${debug_vs_release}/deps/rust_shared* && \
	rm -f /dm_repo/target/${debug_vs_release}/deps/librust_shared* && \
	#rm -f /dm_repo/target/${debug_vs_release}/deps/rust_macros* && \
	#rm -f /dm_repo/target/${debug_vs_release}/deps/librust_macros* && \
	rm -f /dm_repo/target/${debug_vs_release}/deps/app_server_rs* && \
	rm -f /dm_repo/target/${debug_vs_release}/deps/monitor_backend*

# also delete this stuff
RUN rm -f /dm_repo/target/${debug_vs_release}/rust-shared* && \
	rm -f /dm_repo/target/${debug_vs_release}/rust_shared* && \
	rm -f /dm_repo/target/${debug_vs_release}/librust-shared* && \
	rm -f /dm_repo/target/${debug_vs_release}/librust_shared* && \
	rm -f /dm_repo/target/${debug_vs_release}/app-server-rs* && \
	rm -f /dm_repo/target/${debug_vs_release}/app_server_rs* && \
	rm -f /dm_repo/target/${debug_vs_release}/monitor-backend* && \
	rm -f /dm_repo/target/${debug_vs_release}/monitor_backend*
	#rm -rf /dm_repo/target/${debug_vs_release}/incremental && \
	#rm -rf /dm_repo/target/${debug_vs_release}/deps && \
	#rm -rf /dm_repo/target/${debug_vs_release}/build && \

# this special pass is only needed for rust-macros (since it's a proc-macro crate, with special handling)
# RUN rm -f /dm_repo/target/${debug_vs_release}/rust_macros* && \
# 	rm -f /dm_repo/target/${debug_vs_release}/rust-macros* && \
# 	rm -f /dm_repo/target/${debug_vs_release}/librust_macros* && \
# 	rm -f /dm_repo/target/${debug_vs_release}/librust-macros* && \
# 	rm -fr /dm_repo/target/${debug_vs_release}/incremental/rust_macros* && \
# 	rm -fr /dm_repo/target/${debug_vs_release}/.fingerprint/rust-macros*

# relist all paths under "target" that contain "macros" or "shared", to confirm none are left
RUN cd /dm_repo/target && tree -fa | grep -E '(macros|shared)'

# attempt 1, part 2: now copy actual rust-macros Cargo.toml file, for real build
#COPY Packages/rust-macros/Cargo.toml Packages/rust-macros/Cargo.toml