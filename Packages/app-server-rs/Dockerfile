# ------------------------------------------------------------------------------
# Cargo Build Stage
# ------------------------------------------------------------------------------

FROM rust:1.58 as cargo-build

# install mold linker
RUN apt-get update \
	&& apt-get install -y build-essential git clang cmake libstdc++-10-dev libssl-dev libxxhash-dev zlib1g-dev pkg-config \
	&& git clone https://github.com/rui314/mold.git \
	&& cd mold \
	&& git checkout v1.0.1 \
	&& make -j$(nproc) CXX=clang++ \
	&& make install
#RUN apt update
#RUN apt install mold
#for alpine: RUN apk add mold --repository=http://dl-cdn.alpinelinux.org/alpine/edge/testing

#RUN apt-get update
#RUN apt-get install musl-tools -y
#RUN rustup target add x86_64-unknown-linux-musl

#WORKDIR /dm_repo/Packages/app-server-rs
WORKDIR /dm_repo

# this makes-so cargo-build and such uses mold as its linker
COPY .cargo/config.toml .cargo/config.toml
# this makes-so the cargo-build commands ignore warnings in their output (warnings in own code should be noticed/resolved through VSCode squigglies, not clutter in build-output)
ENV RUSTFLAGS=-Awarnings

# cargo's "update crates.io index" step is slow; cache that step in its own layer
#RUN cd ~/.cargo/registry/index/github.com-1ecc6299db9ec823 && git fetch
RUN USER=root cargo new --bin update-index-helper
WORKDIR /dm_repo/update-index-helper
# add one tiny dependency (with no subdeps), so cargo-build updates the index
RUN echo "void = \"1\"" >> Cargo.toml
#RUN RUSTFLAGS=-Clinker=musl-gcc cargo build --release --target=x86_64-unknown-linux-musl
#RUN cargo build --release --target=x86_64-unknown-linux-musl
#RUN cargo build --target=x86_64-unknown-linux-musl
#RUN cargo build -Z timings # can only use this on rust-nightly versions
RUN cargo build

WORKDIR /dm_repo
COPY Packages/app-server-rs/Cargo.toml Packages/app-server-rs/Cargo.toml

# copy "dummy content" for the program (needed for Rust to build the dependencies, without having to rope in app-server's frequently changing own-code)
RUN mkdir Packages/app-server-rs/src/
RUN echo "fn main() { println!(\"if you see this, the build broke\"); }" > Packages/app-server-rs/src/main.rs

WORKDIR /dm_repo/Packages/app-server-rs

# build the dependencies
RUN cargo build
# remove the build output of the "dummy version" of app_server_rs
#RUN rm -f target/x86_64-unknown-linux-musl/release/deps/app_server_rs*
#RUN rm -f target/x86_64-unknown-linux-musl/debug/deps/app_server_rs*
RUN rm -f target/debug/deps/app_server_rs*

# now copy the app-server's own code
COPY Packages/app-server-rs/ .
# and build the actual app-server program
RUN cargo build

# ------------------------------------------------------------------------------
# Final Stage
# ------------------------------------------------------------------------------

#FROM rust:1.58-slim-buster
FROM debian:buster-slim

WORKDIR /dm_repo/Packages/app-server-rs

#COPY --from=cargo-build /dm_repo/Packages/app-server-rs/target/x86_64-unknown-linux-musl/release/app-server-rs .
#COPY --from=cargo-build /dm_repo/Packages/app-server-rs/target/x86_64-unknown-linux-musl/debug/app-server-rs .
COPY --from=cargo-build /dm_repo/Packages/app-server-rs/target/debug/app-server-rs .

CMD echo Starting Rust program...; ./app-server-rs; \
	sleep 1; echo Rust program crashed...
#	sleep 1; echo Rust program crashed...; sleep 123456