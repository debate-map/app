use std::future::Future;
use std::sync::Arc;
use std::task::{Context, Poll, Wake};
use std::thread::{self, Thread};
use std::time::Duration;

use crate::utils::general::time_since_epoch_ms;
use crate::utils::type_aliases::FReceiver;

use super::type_aliases::FSender;

// attempt 1
// ==========

/*lazy_static::lazy_static! {
    //static ref GLOBAL_TICK_RECEIVER: ABReceiver<f64> = create_global_tick_receiver();
    static ref GLOBAL_TICK_RECEIVER: FReceiver<f64> = create_global_tick_receiver();
}
//fn create_global_tick_receiver() -> ABReceiver<f64> {
fn create_global_tick_receiver() -> FReceiver<f64> {
    //let (msg_sender, msg_receiver): (ABSender<f64>, ABReceiver<f64>) = async_broadcast::broadcast(10000);
    let (msg_sender, msg_receiver): (FSender<f64>, FReceiver<f64>) = flume::unbounded();

    let sender_clone = msg_sender.clone();
    let receiver_clone = msg_receiver.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs_f64(0.1));
        loop {
            // first, do a standard tick-wait
            interval.tick().await;

            // then, if the buffer is >100 entries, wait until the buffer-size goes down
            /*while sender_clone.len() > 100 {
                interval.tick().await;
            }*/

            // if the buffer is >100 entries, consume them ourself into it gets back under 100
            while sender_clone.len() > 100 {
                receiver_clone.recv_async().await.unwrap();
            }

            //sender_clone.broadcast(time_since_epoch_ms()).await.unwrap();
            sender_clone.send(time_since_epoch_ms()).unwrap();
            println!("Ticked! @len:{}", sender_clone.len());
        }
    });

    msg_receiver
}
pub async fn global_tick_helper() {
    /*let temp = GLOBAL_TICK_RECEIVER;
    temp.recv().unwrap();*/

    GLOBAL_TICK_RECEIVER.recv_async().await.unwrap();

    //tokio::time::sleep(Duration::from_secs(0)).await
}*/

// attempt 2
// ==========

/// An ugly but necessary workaround to resolve the issue of some futures not being polled reliably. (eg. SubscriptionShard_General::logEntries)
pub async fn make_reliable<T>(fut: impl Future<Output = T>, poll_frequency: Duration) -> T {
    // Pin the future so it can be polled.
    let mut fut = Box::pin(fut);

    // Create a new context to be passed to the future.
    let waker = Arc::new(EmptyWaker).into();
    let mut cx = Context::from_waker(&waker);

    let mut interval = tokio::time::interval(poll_frequency);
    loop {
        // The next two lines are where the magic happens: every X interval, poll the future...
        // ...even if the future-context "above" this function/future is not getting polled reliably
        interval.tick().await;
        match fut.as_mut().poll(&mut cx) {
            Poll::Pending => {},
            Poll::Ready(res) => {
                return res;
            },
        }
    }
}

struct EmptyWaker;
impl Wake for EmptyWaker {
    fn wake(self: Arc<Self>) {
        // do nothing; we merely need a context-object to pass to poll()
    }
}