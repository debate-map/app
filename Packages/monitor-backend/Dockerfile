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
# ----------

# initial arg processing
ENV ENV=$env_ENV
RUN echo "Env:$ENV DebugVSRelease:$debug_vs_release"

# now copy the actual code for each relevant package
COPY Packages/rust-macros/ /dm_repo/Packages/rust-macros/
COPY Packages/rust-shared/ /dm_repo/Packages/rust-shared/
COPY Packages/monitor-backend/ /dm_repo/Packages/monitor-backend/
# ensure rust_shared was copied correctly
RUN echo rerun_flag_1 && cat /dm_repo/Packages/rust-shared/src/lib.rs

# now build everything
WORKDIR /dm_repo/Packages/monitor-backend
RUN RUSTC_BOOTSTRAP=1 cargo rustc ${debug_vs_release_flag} -- -Z time-passes
RUN mkdir -p ./kgetOutput_buildTime && (cp cargo-timing.html ./kgetOutput_buildTime/ || :) && (cp ./*profdata ./kgetOutput_buildTime/ || :)

# STAGE 3 (base-image: debian)
# ==================================================
# ----------
	# use debian v12 (bookworm), because that is what our linker (mold) was built on [mold only has releases for debian v12+], which makes the produced binary require it as well
	FROM debian:bookworm-slim@sha256:5007b106fd828d768975b21cfdcecb51a8eeea9aab815a9e4a169acde464fb89
	ARG copy_from_path
# ----------

WORKDIR /dm_repo/Packages/monitor-backend

COPY --from=cargo-build ${copy_from_path} .
COPY --from=cargo-build /dm_repo/Packages/monitor-backend/kgetOutput_buildTime/ ./kgetOutput_buildTime/

# copy frontend files from monitor-client package (monitor-backend is the web-server for those static files)
COPY Packages/monitor-client/Dist/ /dm_repo/Packages/monitor-client/Dist/

CMD echo Starting Rust program...; \
	RUST_BACKTRACE=full ./monitor-backend; \
	sleep 1; echo Rust program crashed...