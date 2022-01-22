use async_graphql::{Context, Enum, Object, Result, Schema, Subscription, ID, async_stream, OutputType, Json, scalar};
use futures_util::lock::Mutex;
use futures_util::{Stream, StreamExt, stream, TryFutureExt};
use slab::Slab;
use tokio_postgres::types::FromSql;
use tokio_postgres::{Client, Row};
use std::sync::Arc;
use std::time::Duration;

pub type UsersSchema = Schema<QueryRoot, MutationRoot, SubscriptionRoot>;

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct PermissionGroups {
    basic: bool,
	verified: bool,
	r#mod: bool,
	admin: bool,
}

scalar!(PermissionGroups);

// for postgresql<>rust scalar-type mappings (eg. pg's i8 = rust's i64), see: https://kotiri.com/2018/01/31/postgresql-diesel-rust-types.html

#[derive(Clone)]
pub struct User {
    id: ID,
    displayName: String,
    photoURL: String,
    joinDate: i64,
    //permissionGroups: PermissionGroups,
    //permissionGroups: Json<PermissionGroups>,
    permissionGroups: PermissionGroups,
    edits: i32,
    lastEditAt: i64,
}
impl From<tokio_postgres::row::Row> for User {
	fn from(row: tokio_postgres::row::Row) -> Self {
        println!("ID as string:{}", row.get::<_, String>("id"));
		Self {
            //id: ID::from(row.get("id")),
            //id: serde_json::from_value(row.get("id")).unwrap(),
            //id: serde_json::from_str(row.get("id")).unwrap(),
            //id: serde_json::from_str(&row.get::<_, String>("id")).unwrap(),
            id: ID::from(&row.get::<_, String>("id")),
            displayName: row.get("displayName"),
            photoURL: row.try_get("photoURL").unwrap_or_else(|_| "n/a").to_string(),
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
            edits: row.get("edits"),
            lastEditAt: row.try_get("lastEditAt").unwrap_or_else(|_| -1),
		}
	}
}
#[Object]
impl User {
    async fn id(&self) -> &str { &self.id }
    async fn displayName(&self) -> &str { &self.displayName }
    async fn photoURL(&self) -> &str { &self.photoURL }
    async fn joinDate(&self) -> &i64 { &self.joinDate }
    //async fn permissionGroups(&self) -> &PermissionGroups { &self.permissionGroups }
    //async fn permissionGroups(&self) -> Json<PermissionGroups> { self.permissionGroups.clone() }
    //async fn permissionGroups(&self) -> PermissionGroups { PermissionGroups::from(self.permissionGroups) }
    async fn permissionGroups(&self) -> &PermissionGroups { &self.permissionGroups }
    async fn edits(&self) -> &i32 { &self.edits }
    async fn lastEditAt(&self) -> &i64 { &self.lastEditAt }
}

#[derive(Clone)]
pub struct UserHidden {
    id: ID,
    email: String,
    providerData: serde_json::Value,
    backgroundID: String,
    backgroundCustom_enabled: bool,
    backgroundCustom_color: String,
    backgroundCustom_url: String,
    backgroundCustom_position: String,
    addToStream: bool,
    lastAccessPolicy: String,
    extras: serde_json::Value,
}
impl From<tokio_postgres::row::Row> for UserHidden {
	fn from(row: tokio_postgres::row::Row) -> Self {
        println!("ID as string:{}", row.get::<_, String>("id"));
		Self {
            id: ID::from(&row.get::<_, String>("id")),
            email: row.get("email"),
            providerData: serde_json::from_value(row.get("providerData")).unwrap(),
            backgroundID: row.try_get("backgroundID").unwrap_or_else(|_| "n/a").to_string(),
            backgroundCustom_enabled: row.try_get("backgroundCustom_enabled").unwrap_or_else(|_| false),
            backgroundCustom_color: row.try_get("backgroundCustom_color").unwrap_or_else(|_| "n/a").to_string(),
            backgroundCustom_url: row.try_get("backgroundCustom_url").unwrap_or_else(|_| "n/a").to_string(),
            backgroundCustom_position: row.try_get("backgroundCustom_position").unwrap_or_else(|_| "n/a").to_string(),
            addToStream: row.get("addToStream"),
            lastAccessPolicy: row.try_get("lastAccessPolicy").unwrap_or_else(|_| "n/a").to_string(),
            extras: serde_json::from_value(row.get("extras")).unwrap(),
		}
	}
}
#[Object]
impl UserHidden {
    async fn id(&self) -> &str { &self.id }
    async fn email(&self) -> &str { &self.email }
    async fn providerData(&self) -> &serde_json::Value { &self.providerData }
    async fn backgroundID(&self) -> &str { &self.backgroundID }
    #[graphql(name = "backgroundCustom_enabled")]
    async fn backgroundCustom_enabled(&self) -> &bool { &self.backgroundCustom_enabled }
    #[graphql(name = "backgroundCustom_color")]
    async fn backgroundCustom_color(&self) -> &str { &self.backgroundCustom_color }
    #[graphql(name = "backgroundCustom_url")]
    async fn backgroundCustom_url(&self) -> &str { &self.backgroundCustom_url }
    #[graphql(name = "backgroundCustom_position")]
    async fn backgroundCustom_position(&self) -> &str { &self.backgroundCustom_position }
    async fn addToStream(&self) -> &bool { &self.addToStream }
    async fn lastAccessPolicy(&self) -> &str { &self.lastAccessPolicy }
    async fn extras(&self) -> &serde_json::Value { &self.extras }
}

pub type Storage = Arc<Mutex<Slab<User>>>;

pub struct QueryRoot;

#[Object]
impl QueryRoot {
    async fn users(&self, ctx: &Context<'_>) -> Vec<User> {
        let users = ctx.data_unchecked::<Storage>().lock().await;
        users.iter().map(|(_, user)| user).cloned().collect()
    }
}

pub struct MutationRoot;

#[Object]
impl MutationRoot {
    async fn create_user(&self, ctx: &Context<'_>, name: String, author: String) -> ID {
        let mut users = ctx.data_unchecked::<Storage>().lock().await;
        let entry = users.vacant_entry();
        let id: ID = entry.key().into();
        let user = User {
            id: id.clone(),
            displayName: "sdf".to_owned(),
            photoURL: "sdfsd".to_owned(),
            joinDate: 0,
            permissionGroups: PermissionGroups {
            //permissionGroups: Json::from(PermissionGroups {
                basic: true,
                verified: true,
                r#mod: true,
                admin: true,
            },
            edits: 0,
            lastEditAt: 0,
        };
        entry.insert(user);
        /*SimpleBroker::publish(BookChanged {
            mutation_type: MutationType::Created,
            id: id.clone(),
        });*/
        id
    }

    async fn delete_book(&self, ctx: &Context<'_>, id: ID) -> Result<bool> {
        let mut users = ctx.data_unchecked::<Storage>().lock().await;
        let id = id.parse::<usize>()?;
        if users.contains(id) {
            users.remove(id);
            /*SimpleBroker::publish(BookChanged {
                mutation_type: MutationType::Deleted,
                id: id.into(),
            });*/
            Ok(true)
        } else {
            Ok(false)
        }
    }

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

pub struct CollectionWrapper<T> { nodes: Vec<T> }
#[Object] impl<T: OutputType> CollectionWrapper<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }

pub struct CollectionWrapper2<T> { nodes: Vec<T> }
#[Object] impl<T: OutputType> CollectionWrapper2<T> { async fn nodes(&self) -> &Vec<T> { &self.nodes } }

pub struct SubscriptionRoot;

struct PassConnectionID_Result {
    userID: String,
}
#[Object]
impl PassConnectionID_Result {
    async fn userID(&self) -> &str { &self.userID }
}

#[Subscription]
impl SubscriptionRoot {
    #[graphql(name = "_PassConnectionID")]
    async fn _PassConnectionID(&self, ctx: &Context<'_>, connectionID: String) -> impl Stream<Item = PassConnectionID_Result> {
        println!("Connection-id was passed from client:{}", connectionID);

        stream::once(async { PassConnectionID_Result {
            //userID: "todo2".to_owned()
            userID: "DM_SYSTEM_000000000001".to_owned()
        } })
    }

    async fn interval(&self, #[graphql(default = 1)] n: i32) -> impl Stream<Item = i32> {
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
    }

    async fn users(&self, ctx: &Context<'_>) -> impl Stream<Item = CollectionWrapper<User>> {
        let client = ctx.data::<Client>().unwrap();

        /*let rows = client.query("SELECT * FROM \"users\";", &[]).await;
        println!("Users:{:?}", rows);
        let users: Vec<User> = rows.unwrap().iter().map(|row| {
            let result = User::from(row);
            result
        }).collect();*/

        let users = client.query("SELECT * FROM \"users\";", &[])
            .map_ok(|rows| rows.into_iter().map(|r| r.into())
            .collect::<Vec<User>>()).await.unwrap();
        println!("Users:{:?}", users.len());

        stream::once(async {
            CollectionWrapper {
                nodes: users, 
            }
        })
    }
    async fn user(&self, ctx: &Context<'_>, id: String) -> impl Stream<Item = User> {
        let client = ctx.data::<Client>().unwrap();

        /*let row1 = client.query("SELECT * FROM \"users\" WHERE id = $1;", &[&id]).await.unwrap()[0];
        println!("Users matching:{:?}", row1);
        //let user: User = rows.get(0).into();
        let user: User = User::from(row1);*/

        let mut users = client.query("SELECT * FROM \"users\" WHERE id = $1;", &[&id])
            .map_ok(|rows| rows.into_iter().map(|r| r.into())
            .collect::<Vec<User>>()).await.unwrap();
        let user = match users.pop() {
            Some(x) => x,
            _ => panic!("No matching user."),
        };

        stream::once(async { user })
    }

    async fn userHiddens(&self, ctx: &Context<'_>) -> impl Stream<Item = CollectionWrapper2<UserHidden>> {
        let client = ctx.data::<Client>().unwrap();
        let userHiddens = client.query("SELECT * FROM \"userHiddens\";", &[])
            .map_ok(|rows| rows.into_iter().map(|r| r.into())
            .collect::<Vec<UserHidden>>()).await.unwrap();
        println!("UserHiddens:{:?}", userHiddens.len());
        stream::once(async {
            CollectionWrapper2 {
                nodes: userHiddens, 
            }
        })
    }
    async fn userHidden(&self, ctx: &Context<'_>, id: String) -> impl Stream<Item = UserHidden> {
        let client = ctx.data::<Client>().unwrap();
        let mut userHiddens = client.query("SELECT * FROM \"userHiddens\" WHERE id = $1;", &[&id])
            .map_ok(|rows| rows.into_iter().map(|r| r.into())
            .collect::<Vec<UserHidden>>()).await.unwrap();
        let userHidden = match userHiddens.pop() {
            Some(x) => x,
            _ => panic!("No matching user-hidden."),
        };

        stream::once(async { userHidden })
    }
}