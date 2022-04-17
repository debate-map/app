//pub type GQLContext<'a> = async_graphql::Context<'a>; // couldn't get this working right, with #[Subscription] macro
pub type JSONValue = serde_json::Value;

// channels
pub type FSender<T> = flume::Sender<T>;
pub type FReceiver<T> = flume::Receiver<T>;
/*pub type PBSender<T> = postage::broadcast::Sender<T>;
pub type PBReceiver<T> = postage::broadcast::Receiver<T>;*/
pub type ABSender<T> = async_broadcast::Sender<T>;
pub type ABReceiver<T> = async_broadcast::Receiver<T>;