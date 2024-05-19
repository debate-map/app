#[cfg(unix)]
use {
    pyroscope::{pyroscope::PyroscopeAgentReady, PyroscopeAgent},
    pyroscope_pprofrs::{pprof_backend, PprofConfig}
};

use std::{alloc::System, panic, backtrace::Backtrace};
use rust_shared::{domains::{get_env, is_prod}, flume, links::app_server_to_monitor_backend::Message_ASToMB, once_cell::sync::OnceCell, sentry::{self, ClientInitGuard}, tokio, utils::{errors_::backtrace_simplifier::{simplify_backtrace_str}, mtx::mtx::{MtxData, MtxDataWithExtraInfo, MtxGlobalMsg, MTX_GLOBAL_MESSAGE_SENDER_AND_RECEIVER}, type_aliases::{FReceiver, FSender}}};
use tracing::{info, error};
use dotenv::dotenv;

use crate::{utils::general::{mem_alloc::Trallocator, logging::set_up_logging, data_anchor::DataAnchorFor1}, links::monitor_backend_link::MESSAGE_SENDER_TO_MONITOR_BACKEND};

#[global_allocator]
pub static GLOBAL: Trallocator<System> = Trallocator::new(System);

pub fn set_up_globals() -> Option<ClientInitGuard> {
    //panic::always_abort();
    panic::set_hook(Box::new(|info| {
        // do a simple println! first, to confirm our handler started running
        println!("Got panic.");
        // now do basic log of raw info, in case the panic occurred within the logging-system
        println!("Panic info:{} [see next log-message for stack-trace]", info);

        //let stacktrace = Backtrace::capture();
        let stacktrace = Backtrace::force_capture();
        let stacktrace_str_simplified = simplify_backtrace_str(stacktrace.to_string(), true);

        error!("Panic stack-trace:\n==========\n{}", stacktrace_str_simplified);
        std::process::abort();
    }));

    dotenv().ok(); // load the environment variables from the ".env" file

    let sentry_guard = set_up_sentry();
    set_up_logging();
    set_up_mtx_handler();

    GLOBAL.reset();
    info!("Memory used: {} bytes", GLOBAL.get());

    sentry_guard
}

#[cfg(unix)]
pub fn set_up_globals_linux() -> PyroscopeAgent<PyroscopeAgentReady> {
    // configure pprof (profiling backend) + pyroscope
    let pprof_config = PprofConfig::new().sample_rate(100);
    let backend_impl = pprof_backend(pprof_config);
    let agent = PyroscopeAgent::builder("http://pyroscope.monitoring.svc.cluster.local:4040/", "app-server").backend(backend_impl).build().unwrap();
    agent
}
#[cfg(not(unix))]
pub fn set_up_globals_linux() -> Option<bool> { None }

fn set_up_sentry() -> Option<ClientInitGuard> {
    if is_prod() {
        Some(sentry::init(("https://40c1e4f57e8b4bbeb1e5b0cf11abf9e9@o72324.ingest.sentry.io/155432", sentry::ClientOptions {
            release: sentry::release_name!(),
            environment: Some(get_env().into()),
            integrations: vec![
                // added integrations: tracing (see logging.rs)
            ],
            ..Default::default()
        })))
    } else {
        None
    }
}

fn set_up_mtx_handler() {
    let (msg_sender, msg_receiver): (FSender<MtxGlobalMsg>, FReceiver<MtxGlobalMsg>) = flume::unbounded();
    let msg_receiver_clone = msg_receiver.clone();
    MTX_GLOBAL_MESSAGE_SENDER_AND_RECEIVER.set((msg_sender, msg_receiver)).unwrap();

    tokio::spawn(async move {
        loop {
            let msg = msg_receiver_clone.recv_async().await.unwrap();
            match msg {
                MtxGlobalMsg::NotifyMtxDataPossiblyChanged(mtx_data) => {
                    try_send_mtx_data_to_monitor_backend(mtx_data).await;
                }
            }
        }
    });
}

async fn try_send_mtx_data_to_monitor_backend(mtx_data: MtxDataWithExtraInfo) {
    if &Some(mtx_data.data_as_str) != &mtx_data.last_data_as_str {
        let mtx_simple = MtxData {
            id: mtx_data.id,
            section_lifetimes: mtx_data.section_lifetimes,
        };
        if let Err(err) = MESSAGE_SENDER_TO_MONITOR_BACKEND.0.broadcast(Message_ASToMB::MtxEntryDone { mtx: mtx_simple }).await {
            error!("Errored while broadcasting MtxEntryDone message. @error:{}", err);
        }
    }
}