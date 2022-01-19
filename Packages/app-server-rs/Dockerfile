# ------------------------------------------------------------------------------
# Cargo Build Stage
# ------------------------------------------------------------------------------

FROM rust:latest as cargo-build

RUN apt-get update
RUN apt-get install musl-tools -y

RUN rustup target add x86_64-unknown-linux-musl

#WORKDIR /dm_repo/Packages/app-server-rs
WORKDIR /dm_repo

# cargo's "update crates.io index" step is slow; cache that step in its own layer
#RUN cd ~/.cargo/registry/index/github.com-1ecc6299db9ec823 && git fetch
RUN USER=root cargo new --bin update-index-helper
WORKDIR /dm_repo/update-index-helper
# add one tiny dependency (with no subdeps), so cargo-build updates the index
RUN echo "void = \"1\"" >> Cargo.toml
RUN RUSTFLAGS=-Clinker=musl-gcc cargo build --release --target=x86_64-unknown-linux-musl

WORKDIR /dm_repo
COPY Packages/app-server-rs/Cargo.toml Packages/app-server-rs/Cargo.toml

# copy "dummy content" for the program (needed for Rust to build the dependencies, without having to rope in app-server's frequently changing own-code)
RUN mkdir Packages/app-server-rs/src/
RUN echo "fn main() { println!(\"if you see this, the build broke\"); }" > Packages/app-server-rs/src/main.rs

WORKDIR /dm_repo/Packages/app-server-rs

# build the dependencies
#RUN RUSTFLAGS=-Clinker=musl-gcc cargo build --release --target=x86_64-unknown-linux-musl
RUN cargo build --release --target=x86_64-unknown-linux-musl
# remove the build output of the "dummy version" of app-server-rs
RUN rm -f target/x86_64-unknown-linux-musl/release/deps/app-server-rs*

# now copy the app-server's own code
COPY Packages/app-server-rs/ .
# and build the actual app-server program
#RUN RUSTFLAGS=-Clinker=musl-gcc cargo build --release --target=x86_64-unknown-linux-musl
RUN cargo build --release --target=x86_64-unknown-linux-musl

# ------------------------------------------------------------------------------
# Final Stage
# ------------------------------------------------------------------------------

FROM alpine:latest

WORKDIR /dm_repo/Packages/app-server-rs

COPY --from=cargo-build /dm_repo/Packages/app-server-rs/target/x86_64-unknown-linux-musl/release/app-server-rs .

CMD echo Starting Rust program...; ./app-server-rs; sleep 1; echo Rust program crashed...