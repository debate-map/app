use jsonschema::JSONSchema;
use jsonschema::output::BasicOutput;
use lazy_static::lazy_static;
use rust_shared::anyhow::{anyhow, Context, Error, ensure};
use rust_shared::async_graphql::{Object, Schema, Subscription, ID, async_stream, OutputType, scalar, EmptySubscription, SimpleObject, InputObject, self, Enum};
use deadpool_postgres::{Pool, Client, Transaction};
use futures_util::{Stream, stream, TryFutureExt, StreamExt, Future, TryStreamExt};
use rust_shared::hyper::{Body, Method};
use rust_shared::once_cell::sync::Lazy;
use rust_shared::regex::Regex;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::json;
use rust_shared::tokio::sync::{RwLock, Semaphore};
use rust_shared::tokio_postgres::Row;
use rust_shared::utils::general_::extensions::IteratorV;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{serde, GQLError};
use std::collections::HashSet;
use std::path::Path;
use std::rc::Rc;
use std::sync::Arc;
use std::{time::Duration, pin::Pin, task::Poll};

use crate::db::_general::{GenericMutation_Result, ensure_trusted_operator_passkey_is_correct, ensure_gql};
use crate::db::commands::clone_subtree::clone_subtree;
use crate::db::medias::Media;
use crate::db::node_links::NodeLink;
use crate::db::node_phrasings::NodePhrasing;
use crate::db::node_tags::NodeTag;
use crate::db::terms::Term;
use crate::utils::db::filter::{QueryFilter, FilterInput};
use crate::utils::db::pg_row_to_json::postgres_row_to_struct;
use crate::utils::db::sql_fragment::SQLFragment;
use crate::utils::db::transactions::start_read_transaction;
use crate::utils::general::data_anchor::{DataAnchorFor1, DataAnchor};
use crate::utils::{db::{handlers::{handle_generic_gql_collection_request, handle_generic_gql_doc_request, GQLSet}}};
use crate::utils::type_aliases::{PGClientObject};
use crate::utils::db::accessors::{AccessorContext};

use super::subtree_collector::{get_node_subtree, params, get_node_subtree2};

wrap_slow_macros!{

// queries
// ==========

#[derive(InputObject, Serialize, Deserialize)]
pub struct FindUserIdsForGoogleIdInput {
    google_id: String,
    trusted_operator_passkey: String,
}
#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct FindUserIdsForGoogleIdResult {
    user_ids: Vec<String>,
}

#[derive(Default)]
pub struct QueryShard_General_TrustedOperators;
#[Object]
impl QueryShard_General_TrustedOperators {
    /// Special query to find all user-ids associated with a given google-id (needed for user-sync with, eg. claim-miner). Must provide the trusted-provider passkey.
    /// (For now, this passkey is manually created in k8s [eg. using Lens], and shared privately with trusted partners/operators. K8s path: namespace "default", name "debate-map-trusted-provider", field "passkey")
    async fn find_user_ids_for_google_id(&self, gql_ctx: &async_graphql::Context<'_>, input: FindUserIdsForGoogleIdInput) -> Result<FindUserIdsForGoogleIdResult, GQLError> {
        let FindUserIdsForGoogleIdInput { google_id, trusted_operator_passkey } = input;
        ensure_trusted_operator_passkey_is_correct(trusted_operator_passkey, true)?;
        ensure_gql(google_id.len() > 0, "Google-id to search for cannot be empty.")?; // defensive; block finding users with empty google-id (atm only known to be the case for generated dev/test accounts)

        let mut anchor = DataAnchorFor1::empty(); // holds pg-client
        // For this query, bypass rls-checks. It appears safe, and brings major speed-gains (presumably since can use index): with bypass-rls=false, takes ~3000ms; with bypass-rls=true, takes <100ms
        let ctx = AccessorContext::new_read(&mut anchor, gql_ctx, true).await?;
        let rows: Vec<Row> = ctx.tx.query_raw(r#"SELECT id FROM "userHiddens" WHERE ("providerData" #>> '{0,sub}') = $1"#, &[&google_id]).await?.try_collect().await?;
        
        let result = FindUserIdsForGoogleIdResult {
            user_ids: rows.into_iter().map(|a| a.get("id")).collect(),
        };
        Ok(result)
    }
}

}