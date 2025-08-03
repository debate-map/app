ARG RUST_BASE_URL

# see: ./Tilt/Main.star (or source: Packages/deploy/@RustBase/Dockerfile)
FROM $RUST_BASE_URL as cargo-build
ARG ENVIRONMENT
ARG debug_vs_release
ARG debug_vs_release_profile
ARG copy_from_path

# copy this package
COPY Packages/oom-checker/ /dm_repo/Packages/oom-checker/

# initial arg processing
WORKDIR "/dm_repo"
ENV ENVIRONMENT=$ENVIRONMENT
RUN echo "Env:$ENVIRONMENT DebugVSRelease:$debug_vs_release"

# now build everything
WORKDIR /dm_repo/Packages/oom-checker
RUN --mount=type=cache,target=/usr/local/cargo,from=rust,source=/usr/local/cargo \
	--mount=type=cache,target=/dm_repo/target \
	cargo build --profile ${debug_vs_release_profile} && \
	mv ${copy_from_path} /dm_repo/Packages/oom-checker/oom-checker-binary

FROM debian:bookworm-20221114-slim
ARG ENVIRONMENT

WORKDIR /dm_repo/Packages/oom-checker
ENV ENVIRONMENT=$ENVIRONMENT
COPY --from=cargo-build /dm_repo/Packages/app-server/oom-checker-binary .

COPY .env .

CMD echo Starting Rust program... [size: $(ls -lh app-server-binary | awk '{print $5}')]; \
	RUST_BACKTRACE=full ./app-server-binary; \
	sleep 1; echo Rust program crashed...
