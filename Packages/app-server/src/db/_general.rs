use rust_shared::anyhow::{Context, Error, anyhow, ensure};
use rust_shared::async_graphql::{Object, Schema, Subscription, ID, async_stream, OutputType, scalar, EmptySubscription, SimpleObject, InputObject};
use futures_util::{Stream, stream, TryFutureExt, StreamExt, Future};
use rust_shared::indoc::indoc;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::db_constants::SYSTEM_USER_ID;
use rust_shared::utils::general_::extensions::ToOwnedV;
use rust_shared::{async_graphql, serde_json, GQLError, SubError, to_sub_err};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::json;
use rust_shared::tokio_postgres::{Client};
use tracing::{info, error, warn};
use std::env;
use std::path::Path;
use std::{time::Duration, pin::Pin, task::Poll};

use crate::utils::db::agql_ext::gql_request_storage::GQLRequestStorage;

use super::commands::add_term::{AddTermResult};
use super::commands::refresh_lq_data::refresh_lq_data;
use super::general::sign_in_::jwt_utils::{get_user_jwt_data_from_gql_ctx, resolve_and_verify_jwt_string};

/// Wrapper around `ensure!` macro, which makes it easily usable in functions that return `Result<?, GQLError>`.
pub fn ensure_gql(passed: bool, error_message: impl AsRef<str>) -> Result<(), Error> {
    ensure!(passed, "{}", error_message.as_ref());
    Ok(())
}

pub fn trusted_operator_passkey_is_correct(passkey: String, log_message_if_wrong: bool) -> bool {
    let Ok(stored_passkey) = env::var("TRUSTED_OPERATOR_PASSKEY") else {
        error!(indoc!{r#"
            The debate-map-trusted-operator secret/passkey does not exist, or is invalid!
            This endpoint cannot be used until an admin fixes/creates that secret.
            K8s path for secret: namespace "default", name "debate-map-trusted-provider", field "passkey", value any utf8 string
        "#});
        return false;
    };
    let result = passkey == stored_passkey;
    if !result && log_message_if_wrong {
        error!("Trusted-operator passkey is incorrect! Submitted:{}", passkey);
    }
    return result;
}
pub fn ensure_trusted_operator_passkey_is_correct(passkey: String, log_message_if_wrong: bool) -> Result<(), Error> {
    if !trusted_operator_passkey_is_correct(passkey, log_message_if_wrong) {
        return Err(anyhow!("Trusted-operator passkey is incorrect!"));
    }
    Ok(())
}

wrap_slow_macros!{

// queries
// ==========

#[derive(Default)]
pub struct QueryShard_General;
#[Object]
impl QueryShard_General {
    // useful for testing monitor-tool's logs page
    async fn print_empty_log(&self) -> &str {
        info!("print_empty_log called");
        warn!("Test2");
        error!("Test3");
        ""
    }
}

// mutations
// ==========

#[derive(Default)] pub struct MutationShard_General;
#[Object] impl MutationShard_General {
    async fn refreshLQData(&self, ctx: &async_graphql::Context<'_>, payload: JSONValue) -> Result<GenericMutation_Result, GQLError> {
        let result = refresh_lq_data(ctx, payload).await?;
        Ok(result)
    }
}
#[derive(SimpleObject)]
pub struct GenericMutation_Result {
    pub message: String,
}

// subscriptions
// ==========

struct Ping_Result {
    pong: String,
    refreshPage: bool,
}
#[Object]
impl Ping_Result {
    async fn pong(&self) -> &str { &self.pong }
    async fn refreshPage(&self) -> &bool { &self.refreshPage }
}

#[derive(Default)] pub struct SubscriptionShard_General;
#[Subscription] impl SubscriptionShard_General {
    #[graphql(name = "_ping")]
    async fn _ping(&self, _ctx: &async_graphql::Context<'_>) -> impl Stream<Item = Ping_Result> {
        let pong = "pong".to_owned();
        // create the listed file in the app-server pod (eg. using Lens), if you've made an update that you need all clients to refresh for
        let refreshPage = Path::new("./refreshPageForAllUsers_enabled").exists();
        
        stream::once(async move { Ping_Result {
            pong,
            refreshPage,
        } })
    }

    // meant only for debugging, so hide from gql api introspection
    #[graphql(visible = false)]
    async fn checkUser<'a>(&self, ctx: &'a async_graphql::Context<'a>) -> impl Stream<Item = Result<CheckUserResult, SubError>> + 'a {
        let base_stream = async_stream::stream! {
            let jwt_data = get_user_jwt_data_from_gql_ctx(ctx).await.map_err(to_sub_err)?;
            yield Ok(CheckUserResult { userID: jwt_data.id });
        };
        base_stream
    }
}

#[derive(SimpleObject, Debug)]
struct CheckUserResult {
    userID: String,
}

}