use deadpool::managed::Object;
use deadpool_postgres::Manager;

//pub type GQLContext<'a> = async_graphql::Context<'a>; // couldn't get this working right, with #[Subscription] macro
pub type JSONValue = serde_json::Value;
pub type PGClientObject = Object<Manager>;