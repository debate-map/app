# STAGE 1 (base-image: rust)
# ==================================================
# ----------
	#FROM rust:1.65.0-bullseye

	# use the instrumentisto mirror of rust-nightly, so we can pin to a specific build (avoiding a rebuild of the whole build-chain every 24hrs, when the regular rust-nightly image gets re-pushed)
	# NOTE: sync with version in rust-toolchain.toml (and entry in Tiltfile [edit: this part seems outdated?])
	FROM instrumentisto/rust:nightly-bullseye-2024-03-05
# ----------

# generic env-var for code to know if its running as part of a Dockerfile
ENV IN_DOCKER=1

# NOTE: The install steps for alternative linkers below (mold, lld) will often get commented without being removed.
# Main reason: Compatibility between the linkers and distro versions/images change over time, so they cannot always be used together.
# (for additional notes on the linkers, see `.cargo/config.toml` and `Docs/CompilationSpeed.md`)

# install mold linker [2022-04-18: works, 181s]
# RUN apt-get update \
# 	&& apt-get install -y build-essential git clang cmake libstdc++-10-dev libssl-dev libxxhash-dev zlib1g-dev pkg-config \
# 	&& git clone https://github.com/rui314/mold.git \
# 	&& cd mold \
# 	&& git checkout v2.31.0 \
# 	&& ./install-build-deps.sh \
# 	&& cmake -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_COMPILER=c++ -B build \
# 	&& cmake --build build -j$(nproc) \
# 	&& cmake --build build --target install

# install mold linker, from debian's v12 "sid/unstable" repository (mold is not in debian [10/11]'s repository atm) [2022-04-18: works, 72s]
# RUN apt-get update && \
# 	# install some things needed by mold (at mold run-time)
# 	#apt-get -y install build-essential git clang cmake libstdc++-10-dev libssl-dev libxxhash-dev zlib1g-dev pkg-config && \
# 	apt-get -y install clang && \
# 	# install mold
# 	apt-get -y --no-install-recommends install software-properties-common && \
# 	#apt-get -y install software-properties-common && \
# 	add-apt-repository "deb http://httpredir.debian.org/debian sid main" && \
# 	apt-get update && \
# 	apt-get -t sid install -y --no-install-recommends mold
# 	#apt-get -t sid install -y mold

# ensure mold is installed
# RUN mold --version

# install ldd linker
# RUN apt-get update \
# 	&& apt-get install -y lld clang

# also install various other commands (eg. for inspecting folder-structure during build)
RUN apt-get install -y tree

# install the cranelift compiler # commented, since had issues on MA's machine (since ARM)
# RUN mkdir /cg_clif && \
# 	cd /cg_clif && \
# 	curl -o cg_clif-x86_64-unknown-linux-gnu.tar.xz -L https://github.com/bjorn3/rustc_codegen_cranelift/releases/download/dev/cg_clif-x86_64-unknown-linux-gnu.tar.xz && \
# 	tar -xf cg_clif-x86_64-unknown-linux-gnu.tar.xz && \
# 	ls

WORKDIR /dm_repo

# this makes-so cargo-build and such uses mold as its linker
COPY .cargo/config.toml .cargo/config.toml
# this makes-so the cargo-build commands ignore warnings in their output (warnings in own code should be noticed/resolved through VSCode squigglies, not clutter in build-output)
#ENV RUSTFLAGS=-Awarnings # moved to config.toml (we cannot set RUSTFLAGS from multiple places, so chose config.toml as the location for now)
# this sets the debugging-info granularity to "per line", rather than the default "2" which is more detailed; this speeds up builds a bit
ENV CARGO_PROFILE_DEV_DEBUG=1

# rust-base may end up with an old version of the cargo components cached (see next section); to break this cache, we can toggle the number in the next line
RUN echo "Cache-breaker (0 or 1): 0"

# depending on build variables, we may need to collect a few more files before compiling; do this ahead of time for those scenarios, so it's cached in the RustBase image
RUN USER=root cargo new --bin cargo-build-prepper
WORKDIR /dm_repo/cargo-build-prepper
# add one tiny dependency (with no subdeps), so cargo-build updates the index
RUN echo "void = \"1\"" >> Cargo.toml
# compile once with cranelift, so that it can download and install the cargo components it needs (mount-cache attempt in main build command not working fsr)
# RUN /cg_clif/dist/bin/cargo-clif build

WORKDIR /dm_repo
COPY Cargo.toml Cargo.toml
COPY Cargo.lock Cargo.lock