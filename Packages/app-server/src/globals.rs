use std::{alloc::System, panic, backtrace::Backtrace};

use rust_shared::{once_cell::sync::OnceCell, utils::{errors_::backtrace_simplifier::simplify_backtrace_str, mtx::mtx::{MTX_GLOBAL_MESSAGE_SENDER_AND_RECEIVER, MtxGlobalMsg, MtxDataWithExtraInfo, MtxData}, type_aliases::{FReceiver, FSender}}, flume, links::app_server_to_monitor_backend::Message_ASToMB, tokio};
use tracing::{info, error};
use dotenv::dotenv;

use crate::{utils::general::{mem_alloc::Trallocator, logging::set_up_logging}, links::monitor_backend_link::MESSAGE_SENDER_TO_MONITOR_BACKEND};

#[global_allocator]
pub static GLOBAL: Trallocator<System> = Trallocator::new(System);

pub fn set_up_globals() /*-> (ABSender<LogEntry>, ABReceiver<LogEntry>)*/ {
    //panic::always_abort();
    panic::set_hook(Box::new(|info| {
        //let stacktrace = Backtrace::capture();
        let stacktrace = Backtrace::force_capture();
        let stacktrace_str_simplified = simplify_backtrace_str(stacktrace.to_string());

        // if panic occurs, first do a simple logging with println!, in case the panic occurred within the logging-system
        println!("Got panic. @info:{} [see next log-message for stack-trace]", info);

        error!("Got panic. @info:{}\n@stackTrace:\n==========\n{}", info, stacktrace_str_simplified);
        std::process::abort();
    }));

    dotenv().ok(); // load the environment variables from the ".env" file

    set_up_logging();
    set_up_mtx_handler();

    GLOBAL.reset();
    info!("Memory used: {} bytes", GLOBAL.get());
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