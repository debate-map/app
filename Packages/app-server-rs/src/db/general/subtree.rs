use anyhow::{Context, Error};
use async_graphql::{Object, Schema, Subscription, ID, async_stream, OutputType, scalar, EmptySubscription, SimpleObject};
use deadpool_postgres::{Pool, Transaction};
use futures_util::{Stream, stream, TryFutureExt, StreamExt, Future};
use hyper::{Body, Method};
use rust_macros::wrap_slow_macros;
use serde::{Serialize, Deserialize};
use serde_json::json;
use tokio::sync::RwLock;
use deadpool_postgres::{Client};
use std::path::Path;
use std::rc::Rc;
use std::sync::Arc;
use std::{time::Duration, pin::Pin, task::Poll};

use crate::db::access_policies::AccessPolicy;
use crate::db::medias::Media;
use crate::db::node_child_links::NodeChildLink;
use crate::db::node_phrasings::MapNodePhrasing;
use crate::db::node_revisions::MapNodeRevision;
use crate::db::node_tags::MapNodeTag;
use crate::db::nodes::MapNode;
use crate::db::terms::Term;
use crate::links::proxy_to_asjs::{HyperClient, APP_SERVER_JS_URL};
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}}};
use crate::utils::type_aliases::{JSONValue, PGClientObject};

use super::accessor_helpers::AccessorContext;
use super::subtree_collector::{SubtreeCollector, populate_subtree_collector};

// queries
// ==========

/*async fn start_transaction<'a>(ctx: &async_graphql::Context<'a>) -> Result<(PGClientObject, Transaction<'a>), Error> {
    //let client = &mut ctx.data::<Client>().unwrap();
    let pool = ctx.data::<Pool>().unwrap();
    let mut client = pool.get().await.unwrap();
    let tx = client.build_transaction()
        //.isolation_level(tokio_postgres::IsolationLevel::Serializable).start().await?;
        // use with serializable+deferrable+readonly, so that the transaction is guaranteed to not fail (see doc for "deferrable") [there may be a better way] 
        .isolation_level(tokio_postgres::IsolationLevel::Serializable).deferrable(true).read_only(true)
        .start().await?;
    Ok((client, tx))
}*/
/*struct Wrapper<'a> {
    client_temp: Option<PGClientObject>,
    tx_temp: Option<Transaction<'a>>,
    result: Option<WrapperResult<'a>>,
}
type WrapperResult<'a> = (&'a PGClientObject, &'a Transaction<'a>);
impl<'a> Wrapper<'a> {
    fn prep() -> Self {
        Self { client_temp: None, tx_temp: None, result: None }
    }
    async fn call(&mut self, ctx: &async_graphql::Context<'_>, root_node_id: String, max_depth: Option<usize>) -> Result<WrapperResult<'a>, Error> {
        {
           //let client = &mut ctx.data::<Client>().unwrap();
            let pool = ctx.data::<Pool>().unwrap();
            self.client_temp = Some(pool.get().await.unwrap());
            let client = self.client_temp.as_ref().unwrap();
            self.tx_temp = Some(client.build_transaction()
                //.isolation_level(tokio_postgres::IsolationLevel::Serializable).start().await?;
                // use with serializable+deferrable+readonly, so that the transaction is guaranteed to not fail (see doc for "deferrable") [there may be a better way] 
                .isolation_level(tokio_postgres::IsolationLevel::Serializable).deferrable(true).read_only(true)
                .start().await?);
        }
        self.result = Some((self.client_temp.as_ref().unwrap(), self.tx_temp.as_ref().unwrap()));
        Ok(*self.result.as_ref().unwrap())
    }
}
async fn test_call(ctx: &async_graphql::Context<'_>, root_node_id: String, max_depth: Option<usize>) {
    let mut wrapper = Wrapper::prep();
    let (client, tx) = wrapper.call(ctx, root_node_id, max_depth).await.unwrap();
}*/

struct Toy {
    name: String,
    used: bool,
}
struct CatEnvironment {
    toy1: Option<Toy>,
    toy2: Option<Toy>,
}
impl CatEnvironment {
    fn prep() -> Self {
        Self {
            toy1: None,
            toy2: None,
        }
    }
    /*fn parts(&mut self) -> (&mut Option<Toy>, &mut Option<Toy>) {
        (&mut self.toy1, &mut self.toy2)
    }*/
}
/*struct Cat<'a> {
    target_toy: &'a Toy,
}
impl<'a> Cat<'a> {
    fn play_with_target_toy(&self) {
        println!("Cat played with target toy named:{}", self.target_toy.name);
    }
    /*fn play_with<'a>(&self, toy: &'a mut Toy) {
        println!("Cat played with toy named:{}", toy.name);
    }*/
}*/
fn prep_env_then_have_cat_play_with_a_toy(env: &mut CatEnvironment) {
    let CatEnvironment { toy1, toy2 } = env;
    *toy1 = Some(Toy { name: "yarn".to_owned(), used: false });
    *toy2 = Some(Toy { name: "mouse".to_owned(), used: false });
    // cat plays with toy1 here
    println!("Cat played with toy named:{}", toy1.as_ref().unwrap().name);
}

fn watch_cat_play() {
    let mut env = CatEnvironment::prep();
    prep_env_then_have_cat_play_with_a_toy(&mut env);
    println!("Is toy1 played with:{}", env.toy1.as_ref().unwrap().used);
}

/*async fn get_client<'a>(ctx: &async_graphql::Context<'_>) -> Result<PGClientObject, Error> {
    let pool = ctx.data::<Pool>().unwrap();
    Ok(pool.get().await.unwrap())
}
async fn get_tx<'a>(client: &'a mut PGClientObject) -> Result<Transaction<'a>, Error> {
    let tx = client.build_transaction()
        //.isolation_level(tokio_postgres::IsolationLevel::Serializable).start().await?;
        // use with serializable+deferrable+readonly, so that the transaction is guaranteed to not fail (see doc for "deferrable") [there may be a better way] 
        .isolation_level(tokio_postgres::IsolationLevel::Serializable).deferrable(true).read_only(true)
        .start().await?;
    Ok(tx)
}
async fn start_transaction_and_do_stuff(ctx: &async_graphql::Context<'_>) -> Result<(), Error> {
    let mut client = get_client(ctx).await?;
    let tx = get_tx(&mut client).await?;
    // code that uses the transaction
    Ok(())
}*/










// earlier attempt; didn't work because it was trying to hold the transaction object in the data struct, whereas the new approach just returns that transaction
/*struct TransactionEnv<'a> {
    client: Option<PGClientObject>,
    tx: Option<Transaction<'a>>,
}
impl<'a> TransactionEnv<'a> {
    fn new() -> Self {
        Self { client: None, tx: None }
    }
}
async fn start_transaction_old<'a>(env: &'a mut TransactionEnv<'a>, ctx: &async_graphql::Context<'_>, root_node_id: String, max_depth: Option<usize>) -> Result<TransactionEnv<'a>, Error> {
    //let TransactionEnv { client, tx } = env;
    //let client = &mut env.client;
    //let tx = &mut env.tx;
    
    //let client = &mut ctx.data::<Client>().unwrap();
    let pool = ctx.data::<Pool>().unwrap();
    env.client = Some(pool.get().await.unwrap());
    {
        let temp = env.client.as_mut().unwrap();
        let temp2 = temp.build_transaction()
            //.isolation_level(tokio_postgres::IsolationLevel::Serializable).start().await?;
            // use with serializable+deferrable+readonly, so that the transaction is guaranteed to not fail (see doc for "deferrable") [there may be a better way] 
            .isolation_level(tokio_postgres::IsolationLevel::Serializable).deferrable(true).read_only(true)
            .start().await?;
        env.tx = Some(temp2);
    }
    Ok(env)
}
async fn test_call(ctx: &async_graphql::Context<'_>, root_node_id: String, max_depth: Option<usize>) -> Result<(), Error> {
    let mut env = TransactionEnv::new();
    let env = start_transaction_old(&mut env, ctx, root_node_id, max_depth).await?;
    Ok(())
}*/


// This "data anchor" struct helps expand function-based encapsulation to more cases:
// * Those where you want to construct object X in a function, then construct a derivative/ref-using object Y and return it, without hitting Rust borrow-checker errors from object X's lifetime ending in that function.
// With this "data anchor", you can easily construct a longer-persistence "container" for that object X, without needing to know the exact shape of data needed, nor having to pass the same arguments in two places.
// See here for more info (both the linked answer, and the rest of the question/answers): https://stackoverflow.com/a/72925407

// more flexible version (seems to work, but going with simpler version for now)
/*struct DataAnchor<T1, T2, T3> {
    val1: Option<T1>,
    val2: Option<T2>,
    val3: Option<T3>,
}
impl<T1, T2, T3> DataAnchor<T1, T2, T3> {
    fn empty() -> Self { Self { val1: None, val2: None, val3: None } }
    fn holding1(val1: T1) -> Self { Self { val1: Some(val1), val2: None, val3: None } }
    fn holding2(val1: T1, val2: T2) -> Self { Self { val1: Some(val1), val2: Some(val2), val3: None } }
    fn holding3(val1: T1, val2: T2, val3: T3) -> Self { Self { val1: Some(val1), val2: Some(val2), val3: Some(val3) } }
}
type DataAnchorFor3<T1, T2, T3> = DataAnchor<T1, T2, T3>;
type DataAnchorFor2<T1, T2> = DataAnchor<T1, T2, bool>;
type DataAnchorFor1<T1> = DataAnchor<T1, bool, bool>;*/

// simpler version, for now
struct DataAnchorFor1<T> {
    val1: Option<T>,
}
impl<T> DataAnchorFor1<T> {
    fn empty() -> Self { Self { val1: None } }
    fn holding(val1: T) -> Self { Self { val1: Some(val1) } }
}

async fn get_client<'a>(ctx: &async_graphql::Context<'_>) -> Result<PGClientObject, Error> {
    let pool = ctx.data::<Pool>().unwrap();
    Ok(pool.get().await.unwrap())
}
async fn start_transaction<'a>(anchor: &'a mut DataAnchorFor1<PGClientObject>, ctx: &async_graphql::Context<'_>) -> Result<Transaction<'a>, Error> {
    // get client, then store it in anchor object the caller gave us a mut-ref to
    *anchor = DataAnchorFor1::holding(get_client(ctx).await?);
    // now retrieve client from storage-slot we assigned to in the previous line
    let client = anchor.val1.as_mut().unwrap();
    
    let tx = client.build_transaction()
        //.isolation_level(tokio_postgres::IsolationLevel::Serializable).start().await?;
        // use with serializable+deferrable+readonly, so that the transaction is guaranteed to not fail (see doc for "deferrable") [there may be a better way] 
        .isolation_level(tokio_postgres::IsolationLevel::Serializable).deferrable(true).read_only(true)
        .start().await?;
    Ok(tx)
}
async fn start_transaction_and_do_stuff(ctx: &async_graphql::Context<'_>) -> Result<(), Error> {
    let mut anchor = DataAnchorFor1::empty(); // holds client object
    let tx = start_transaction(&mut anchor, ctx).await?;
    //println!("Test:{}", anchor.val1.as_ref().unwrap().statement_cache.size());
    // code that uses the transaction
    Ok(())
}

wrap_slow_macros!{

#[derive(SimpleObject, Clone, Serialize, Deserialize, Default)]
pub struct Subtree {
    pub terms: Vec<Term>,
    pub medias: Vec<Media>,
    pub nodes: Vec<MapNode>,
    pub nodeChildLinks: Vec<NodeChildLink>,
    pub nodeRevisions: Vec<MapNodeRevision>,
    pub nodePhrasings: Vec<MapNodePhrasing>,
    pub nodeTags: Vec<MapNodeTag>,
}

async fn get_subtree(ctx: &AccessorContext<'_>, root_node_id: String, max_depth: Option<usize>) -> Result<Subtree, Error> {
    let collector = SubtreeCollector::default();
    let root_path_segments = vec![root_node_id.clone()];
    let collector_arc = Arc::new(RwLock::new(collector));
    populate_subtree_collector(&ctx, root_node_id, max_depth.unwrap_or(usize::MAX), &root_path_segments, collector_arc.clone()).await?;

    let arc_clone = collector_arc.clone();
    let collector = arc_clone.read().await;
    let subtree = collector.to_subtree();
    Ok(subtree)
}

#[derive(Default)]
pub struct QueryShard_General_Subtree;
#[Object]
impl QueryShard_General_Subtree {
    /*async fn subtree<'a>(&self, gql_ctx: &async_graphql::Context<'a>, root_node_id: String, max_depth: Option<usize>) -> Result<Subtree, Error> {
        let tx = start_transaction(gql_ctx).await?;
        let ctx = AccessorContext::new(tx);
        let subtree = get_subtree(&ctx, root_node_id, max_depth).await?;
        Ok(subtree)
    }*/
    async fn subtree(&self, gql_ctx: &async_graphql::Context<'_>, root_node_id: String, max_depth: Option<usize>) -> Result<Subtree, Error> {
        let mut anchor = DataAnchorFor1::empty(); // holds pg-client
        let tx = start_transaction(&mut anchor, gql_ctx).await?;
        let ctx = AccessorContext::new(tx);

        let collector = SubtreeCollector::default();
        let root_path_segments = vec![root_node_id.clone()];
        let collector_arc = Arc::new(RwLock::new(collector));
        populate_subtree_collector(&ctx, root_node_id, max_depth.unwrap_or(usize::MAX), &root_path_segments, collector_arc.clone()).await?;

        let arc_clone = collector_arc.clone();
        let collector = arc_clone.read().await;
        let subtree = collector.to_subtree();

        Ok(subtree)
    }
}

#[derive(Default)]
pub struct MutationShard_General_Subtree;
#[Object]
impl MutationShard_General_Subtree {
    async fn cloneSubtree(&self, gql_ctx: &async_graphql::Context<'_>, root_node_id: String, max_depth: Option<usize>) -> Result<Subtree, Error> {
        //let tx = start_transaction(gql_ctx).await?;
        let mut anchor = DataAnchorFor1::empty(); // holds pg-client
        let tx = start_transaction(&mut anchor, gql_ctx).await?;
        let ctx = AccessorContext::new(tx);

        let subtree = get_subtree(&ctx, root_node_id, max_depth).await?;

        //let (cat1, cat2) = create_cat_then_populate_then_return_both();
        
        Ok(subtree)
    }
    /*async fn test(&self) -> Result<String, Error> {
        Ok("".to_owned())
    }*/
}

}

/*struct Cat<'a> {
    parent: Option<&'a Cat<'a>>,
    has_children: bool,
}
impl<'a> Cat<'a> {
    fn new(parent: Option<&'a Cat<'a>>) -> Cat {
        Cat {
            parent,
            has_children: false,
        }
    }
    fn populate(&mut self) -> Cat {
        self.has_children = true;
        Cat::new(Some(self))
    }
}

struct create_cat_then_populate_then_return_both<'a> {
    cat1_temp: Option<Cat<'a>>,
    cat2_temp: Option<Cat<'a>>,
    //cat1_ref: &'a Cat<'a>,
    //cat2_ref: &'a Cat<'a>,
    result: Option<(&'a Cat<'a>, &'a Cat<'a>)>,
}
impl<'a> create_cat_then_populate_then_return_both<'a> {
    fn prep() -> Self {
        Self { cat1_temp: None, cat2_temp: None, result: None }
    }
    fn call(&mut self) -> (&'a Cat<'a>, &'a Cat<'a>) {
        {
            self.cat1_temp = Some(Cat::new(None));
            let cat1 = self.cat1_temp.as_ref().unwrap();
            self.cat2_temp = Some(cat1.populate());
            //let cat2 = self.cat2_temp.as_ref().unwrap();
        }
        self.result = Some((self.cat2_temp.as_ref().unwrap(), self.cat2_temp.as_ref().unwrap()));
        *self.result.as_ref().unwrap()
    }
}

fn caller() {
    //let (cat1, cat2) = create_cat_then_populate_then_return_both(return_data);
    let mut wrapper = create_cat_then_populate_then_return_both::prep();
    let (cat1, cat2) = wrapper.call();
    println!("Cat2 has parent:{}", cat2.parent.is_some());
}*/