use async_graphql::{Context, Object, Result, Schema, Subscription, ID, async_stream, OutputType, scalar, EmptySubscription};
use futures_util::{Stream, stream, TryFutureExt, StreamExt, Future};
use tokio_postgres::{Client};
use std::time::Duration;

use crate::utils::general::get_first_item_from_stream_in_result_in_future;

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct PermissionGroups {
    basic: bool,
	verified: bool,
	r#mod: bool,
	admin: bool,
}
scalar!(PermissionGroups);

// for postgresql<>rust scalar-type mappings (eg. pg's i8 = rust's i64), see: https://kotiri.com/2018/01/31/postgresql-diesel-rust-types.html

//type User = String;
#[derive(Clone)]
pub struct User {
    id: ID,
    displayName: String,
    photoURL: Option<String>,
    joinDate: i64,
    //permissionGroups: PermissionGroups,
    //permissionGroups: Json<PermissionGroups>,
    permissionGroups: PermissionGroups,
    //permissionGroups: async_graphql::Value,
    //permissionGroups: String,
    edits: i32,
    lastEditAt: Option<i64>,
}
#[Object]
impl User {
    async fn id(&self) -> &str { &self.id }
    async fn displayName(&self) -> &str { &self.displayName }
    async fn photoURL(&self) -> &Option<String> { &self.photoURL }
    async fn joinDate(&self) -> &i64 { &self.joinDate }
    //async fn permissionGroups(&self) -> &PermissionGroups { &self.permissionGroups }
    //async fn permissionGroups(&self) -> Json<PermissionGroups> { self.permissionGroups.clone() }
    //async fn permissionGroups(&self) -> PermissionGroups { PermissionGroups::from(self.permissionGroups) }
    async fn permissionGroups(&self) -> &PermissionGroups { &self.permissionGroups }
    //async fn permissionGroups(&self) -> &str { &self.permissionGroups }
    async fn edits(&self) -> &i32 { &self.edits }
    async fn lastEditAt(&self) -> &Option<i64> { &self.lastEditAt }
}
impl From<tokio_postgres::row::Row> for User {
	fn from(row: tokio_postgres::row::Row) -> Self {
        //println!("ID as string:{}", row.get::<_, String>("id"));
		Self {
            //id: ID::from(row.get("id")),
            //id: serde_json::from_value(row.get("id")).unwrap(),
            //id: serde_json::from_str(row.get("id")).unwrap(),
            //id: serde_json::from_str(&row.get::<_, String>("id")).unwrap(),
            id: ID::from(&row.get::<_, String>("id")),
            displayName: row.get("displayName"),
            photoURL: row.get("photoURL"),
            joinDate: row.get("joinDate"),
            /*permissionGroups: PermissionGroups {
            //permissionGroups: Json::from(PermissionGroups {
                basic: true,
                verified: true,
                r#mod: true,
                admin: true,
            },*/
            //permissionGroups: row.get("permissionGroups"),
            permissionGroups: serde_json::from_value(row.get("permissionGroups")).unwrap(),
            //permissionGroups: async_graphql::value!("{}"),
            //permissionGroups: "{}".to_owned(),
            edits: row.get("edits"),
            lastEditAt: row.get("lastEditAt"),
		}
	}
}

#[derive(Default)]
pub struct QueryShard_User;
#[Object]
impl QueryShard_User {
    /// async-graphql requires that to be at least one entry under the Query section
    async fn empty(&self) -> &str { &"" }
}

#[derive(Default)]
pub struct MutationShard_User;
#[Object]
impl MutationShard_User {
    #[graphql(name = "_GetConnectionID")]
    async fn _GetConnectionID(&self, ctx: &Context<'_>) -> Result<GetConnectionID_Result> {
        Ok(GetConnectionID_Result {
            id: "todo".to_owned()
        })
    }
}

struct GetConnectionID_Result {
    id: String,
}
#[Object]
impl GetConnectionID_Result {
    async fn id(&self) -> &str { &self.id }
}

pub struct GQLSet_User<T> { nodes: Vec<T> }
#[Object] impl<T: OutputType> GQLSet_User<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }

struct PassConnectionID_Result {
    userID: String,
}
#[Object]
impl PassConnectionID_Result {
    async fn userID(&self) -> &str { &self.userID }
}

#[derive(Default)]
pub struct SubscriptionShard_User;
#[Subscription]
impl SubscriptionShard_User {
    #[graphql(name = "_PassConnectionID")]
    async fn _PassConnectionID(&self, ctx: &Context<'_>, connectionID: String) -> impl Stream<Item = PassConnectionID_Result> {
        println!("Connection-id was passed from client:{}", connectionID);

        stream::once(async { PassConnectionID_Result {
            //userID: "todo2".to_owned()
            userID: "DM_SYSTEM_000000000001".to_owned()
        } })
    }

    // tests
    /*async fn interval(&self, #[graphql(default = 1)] n: i32) -> impl Stream<Item = i32> {
        let mut value = 0;
        async_stream::stream! {
            loop {
                futures_timer::Delay::new(Duration::from_secs(1)).await;
                value += n;
                yield value;
            }
        }
    }
    async fn test(&self, /*mutation_type: Option<MutationType>*/) -> impl Stream<Item = i32> {
        stream::iter(0..100)
    }*/

    async fn users(&self, ctx: &Context<'_>, id: Option<String>) -> impl Stream<Item = GQLSet_User<User>> {
        let client = ctx.data::<Client>().unwrap();

        let rows = match id {
            Some(id) => client.query("SELECT * FROM \"users\" WHERE id = $1;", &[&id]).await.unwrap(),
            None => client.query("SELECT * FROM \"users\";", &[]).await.unwrap(),
        };
        let entries: Vec<User> = rows.into_iter().map(|r| r.into()).collect();
        //println!("Users:{:?}", entries.len());
        //let entries: Vec<User> = vec!["hi".to_string()];

        stream::once(async {
            GQLSet_User {
                nodes: entries, 
            }
        })
    }
    async fn user(&self, ctx: &Context<'_>, id: String) -> impl Stream<Item = Option<User>> {
        /*let stream = self.users(ctx, Some(id)).await.unwrap();
        let mut wrapper: CollectionWrapper<User> = stream.collect::<Vec<CollectionWrapper<User>>>().await.pop().unwrap();*/
        let mut wrapper = get_first_item_from_stream_in_result_in_future(self.users(ctx, Some(id))).await;
        let entry = wrapper.nodes.pop();
        stream::once(async { entry })
    }
}