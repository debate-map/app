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
ENV ENV=$env_ENV
RUN echo "Env:$ENV DebugVSRelease:$debug_vs_release"

# copy the shared packages
COPY Packages/rust-macros/ /dm_repo/Packages/rust-macros/
COPY Packages/rust-shared/ /dm_repo/Packages/rust-shared/

# copy this package
COPY Packages/monitor-backend/ /dm_repo/Packages/monitor-backend/

# copy "dummy content" for each other non-shared package (needed for Rust to build the dependencies, without having to rope in the changing own-code of each package)
COPY Packages/web-server/Cargo.toml Packages/web-server/Cargo.toml
RUN mkdir Packages/web-server/src/
RUN echo "fn main() { println!(\"if you see this, the build broke\"); }" > Packages/web-server/src/main.rs
COPY Packages/app-server/Cargo.toml Packages/app-server/Cargo.toml
RUN mkdir Packages/app-server/src/
RUN echo "fn main() { println!(\"if you see this, the build broke\"); }" > Packages/app-server/src/main.rs

# now build everything
WORKDIR /dm_repo/Packages/monitor-backend
# to clear the cache below (and all other mount-caches), run: docker builder prune --filter type=exec.cachemount
RUN --mount=type=cache,target=/usr/local/cargo,from=rust,source=/usr/local/cargo \
	--mount=type=cache,target=/dm_repo/target \
#	RUSTC_BOOTSTRAP=1 cargo rustc ${debug_vs_release_flag} -- -Z time-passes
#	RUSTC_BOOTSTRAP=1 cargo build --timings ${debug_vs_release_flag} && \
	cargo build --timings ${debug_vs_release_flag} && \
	# move binary out of target folder, else will stay in cache volume and be inaccessible in later steps
	mv ${copy_from_path} /dm_repo/Packages/monitor-backend/monitor-backend-binary

RUN mkdir -p ./kgetOutput_buildTime && (cp cargo-timing.html ./kgetOutput_buildTime/ || :) && (cp ./*profdata ./kgetOutput_buildTime/ || :)

# STAGE 3 (base-image: debian)
# ==================================================
# ----------
	# use debian v12 (bookworm), because that is what our linker (mold) was built on [mold only has releases for debian v12+], which makes the produced binary require it as well
	#FROM debian:bookworm-slim@sha256:5007b106fd828d768975b21cfdcecb51a8eeea9aab815a9e4a169acde464fb89
	FROM debian:bookworm-20221114-slim
	ARG env_ENV
# ----------

WORKDIR /dm_repo/Packages/monitor-backend
ENV ENV=$env_ENV

COPY --from=cargo-build /dm_repo/Packages/monitor-backend/monitor-backend-binary .
COPY --from=cargo-build /dm_repo/Packages/monitor-backend/kgetOutput_buildTime/ ./kgetOutput_buildTime/

# copy frontend files from monitor-client package (monitor-backend is the web-server for those static files)
COPY Packages/monitor-client/Dist/ /dm_repo/Packages/monitor-client/Dist/

CMD echo Starting Rust program...; \
	RUST_BACKTRACE=full ./monitor-backend-binary; \
	sleep 1; echo Rust program crashed...