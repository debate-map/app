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
	# todo: switch to this newer debian image, to match with app-server-rs -- once error relating to libssl is resolved
	# (error being: "error while loading shared libraries: libssl.so.1.1: cannot open shared object file: No such file or directory")
	#FROM debian:bookworm-20221114-slim
	ARG copy_from_path
# ----------

WORKDIR /dm_repo/Packages/monitor-backend

# temp (for ssl connections; will look for cleaner way soon)
#RUN cat /var/run/secrets/kubernetes.io/serviceaccount/ca.crt >> /etc/ssl/certs/ca-certificates.crt
#RUN cp /var/run/secrets/kubernetes.io/serviceaccount/ca.crt /etc/ssl/certs/ca-certificates.crt
RUN apt-get update && apt-get install -y ca-certificates
#RUN mkdir /usr/local/share/ca-certificates
#RUN update-ca-certificates

# check openssl version included with OS
#RUN openssl version -v
# for "debian:bookworm-20221114-slim", we get: "OpenSSL 3.0.7 1 Nov 2022 (Library: OpenSSL 3.0.7 1 Nov 2022)"

# install required version of libssl
# ==========
#RUN apt-get update && apt-get install -y ca-certificates libssl-dev
#RUN apt-get update && apt-get install -y libssl-1.1

#RUN apt-get update
#RUN apt-get install -y build-essential cmake zlib1g-dev libcppunit-dev git subversion wget && rm -rf /var/lib/apt/lists/*
#RUN wget https://www.openssl.org/source/openssl-1.1.0g.tar.gz -O - | tar -xz
#WORKDIR /openssl-1.1.0g
#RUN ./config --prefix=/usr/local/openssl --openssldir=/usr/local/openssl && make && make install

# RUN apt-get update
# RUN apt-get -y remove openssl
# RUN apt-get -y install gcc
# RUN DEBIAN_FRONTEND=noninteractive apt-get -q update && apt-get -qy install wget make \
#     && wget https://www.openssl.org/source/openssl-1.1.0g.tar.gz \
#     && tar -xzvf openssl-1.1.0g.tar.gz \
#     && cd openssl-1.1.0g \
#     && ./config \
#     && make install \
#     && ln -sf /usr/local/ssl/bin/openssl 'which openssl'
# ==========

COPY --from=cargo-build ${copy_from_path} .
COPY --from=cargo-build /dm_repo/Packages/monitor-backend/kgetOutput_buildTime/ ./kgetOutput_buildTime/

# copy frontend files from monitor-client package (monitor-backend is the web-server for those static files)
COPY Packages/monitor-client/Dist/ /dm_repo/Packages/monitor-client/Dist/

CMD echo Starting Rust program...; \
\
	# try to find better way to enable ssl connections...
	cat /var/run/secrets/kubernetes.io/serviceaccount/ca.crt >> /usr/local/share/ca-certificates/k8s_ca.crt; \
	update-ca-certificates; \
\
	RUST_BACKTRACE=full ./monitor-backend; \
	sleep 1; echo Rust program crashed...