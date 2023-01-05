use std::collections::{HashMap, HashSet};
use std::env;
use std::time::Duration;

use deadpool_postgres::tokio_postgres::Row;
use rust_shared::domains::{get_server_url, ServerPod, GetServerURL_Options};
use rust_shared::once_cell::sync::{Lazy, OnceCell};
use rust_shared::hyper::{Request, Body, Method};
use oauth2::basic::BasicClient;
use oauth2::reqwest::async_http_client;
use oauth2::{PkceCodeChallenge, RevocationUrl, RedirectUrl, TokenUrl, AuthUrl, Scope, CsrfToken, ClientSecret, ClientId, AuthorizationCode, StandardRevocableToken};
use oauth2::TokenResponse;
use rust_shared::anyhow::{Context, anyhow, Error};
use rust_shared::async_graphql::{Object, Schema, Subscription, ID, async_stream, OutputType, scalar, EmptySubscription, SimpleObject, InputObject};
use futures_util::{Stream, TryStreamExt};
use rust_shared::axum::response::IntoResponse;
use rust_shared::axum::{Router, response};
use rust_shared::axum::extract::{Extension, Path};
use rust_shared::axum::routing::get;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::json;
use rust_shared::utils::db::uuid::{new_uuid_v4_as_b64, new_uuid_v4_as_b64_id};
use rust_shared::db_constants::SYSTEM_POLICY_PUBLIC_UNGOVERNED_NAME;
use rust_shared::utils::futures::make_reliable;
use rust_shared::utils::general::{get_uri_params, k8s_dev};
use rust_shared::indoc::{indoc, formatdoc};
use rust_shared::utils::time::time_since_epoch_ms_i64;
use rust_shared::utils::type_aliases::{JSONValue, JWTDuration};
use rust_shared::utils::_k8s::{get_or_create_k8s_secret};
use rust_shared::{async_graphql, serde_json, SubError, to_sub_err, to_sub_err_in_stream, to_anyhow};
use tracing::{info, error, warn};
use rust_shared::jwt_simple::prelude::{HS256Key, Claims, MACLike, VerificationOptions};

use crate::db::_general::GenericMutation_Result;
use crate::db::general::sign_in_::fake_user::username_to_fake_user_data;
use crate::db::access_policies::{get_access_policy, get_system_access_policy};
use crate::db::commands::_command::set_db_entry_by_id_for_struct;
use crate::db::general::sign_in_::google::{store_user_data_for_google_sign_in, GoogleUserInfoResult};
use crate::db::general::subtree_collector::params;
use crate::db::user_hiddens::{UserHidden, get_user_hiddens, get_user_hidden};
use crate::db::users::{get_user, User, PermissionGroups};
use crate::store::storage::{AppStateArc, SignInMsg, get_app_state_from_gql_ctx};
use crate::utils::db::accessors::{AccessorContext, get_db_entries};
use crate::utils::general::data_anchor::DataAnchorFor1;
use crate::utils::general::general::{body_to_str};
use crate::utils::type_aliases::{ABSender};

use rust_shared::utils::auth::jwt_utils_base::{UserJWTData, get_or_create_jwt_key_hs256};

use super::sign_in_::jwt_utils::try_get_referrer_from_gql_ctx;

async fn auth_google_callback(Extension(state): Extension<AppStateArc>, req: Request<Body>) -> impl IntoResponse {
    let uri = req.uri();
    let params = get_uri_params(uri);
    let attempt_id = params.get("state").map(|a| a.clone()).unwrap_or("n/a".to_owned());

    info!("Got uri:{:?} @attemptID:{}", uri, attempt_id);
    if let Err(err) = state.channel_for_sign_in_messages__sender_base.broadcast(SignInMsg::GotCallbackData(uri.clone())).await {
        error!("Got error while broadcasting callback-data:{}", err);
        return response::Html(format!("Got error while broadcasting callback-data. Please refresh page to try again."));
    }
    response::Html(formatdoc!(r#"<html>
        <head><script>window.close();</script></head>
        <body><div>Data has been broadcast through the sign-in-message channel... (you can close this page now)</div></body>
    </html>"#))
}

pub async fn extend_router(app: Router) -> Router {
    let result = app
        .route("/auth/google/callback", get(auth_google_callback));
    result
}

// Why is this placed here? So that it's nearby the other sign-in-related explanation-messages. (ie. in the `SignInStartResult.instructions` and `signInStart` funcs below)
pub fn get_err_auth_data_required() -> Error {
    anyhow!(indoc!{"
        This endpoint requires auth-data to be supplied!
        For website browsing, this means signing-in using the panel at the top-right.
        For direct requests to the graphql api, this means obtaining your auth-data/jwt-string manually (see the \"signInStart\" endpoint at \"http://debates.app/gql-playground\"), and attaching it to your commands/requests.
        Specifically:
        * For queries/mutations, the http request should have an \"authorization\" header, with contents matching: \"Bearer <jwt string here>\"
        * For subscriptions, the auth-requiring graphql call should be preceded by a call to `signInAttach`, with the `jwt` field in the passed input-param equaling the jwt string.
    "})
}

wrap_slow_macros!{

#[derive(InputObject, Deserialize)]
pub struct SignInStartInput {
	pub provider: String,
    pub jwtDuration: i64,
    pub preferredUsername: Option<String>,
}

struct SignInStartResult {
    auth_link: Option<String>,
    result_jwt: Option<String>,
}
#[Object]
impl SignInStartResult {
    async fn instructions(&self) -> Vec<String> {
        vec![
            "1) After initial call to this endpoint, you'll see these instructions, and an \"authLink\" url below. Open that link in your browser to launch google sign-in.".to_owned(),
            "2) On completion of sign-in, the \"resultJWT\" field below will populate with your JWT string.".to_owned(),
            "3) For queries/mutations, add the JWT string to the \"authorization\" header, eg. in gql-playground, paste this into \"HTTP HEADERS\" panel at bottom left: {\"authorization\": \"Bearer <jwt text here>\"}".to_owned(),
            "4) For subscriptions, call the \"signInAttach\" endpoint (at start of subscription block containing the auth-requiring endpoint), passing in the JWT string as the `input.jwt` field.".to_owned(),
            "5) Call the endpoints that required authentication. Now that the JWT token is included in the http headers (or attached to the websocket connection), it should succeed. (assuming your account has the needed permissions)".to_owned(),
        ]
    }
    async fn authLink(&self) -> Option<String> { self.auth_link.clone() }
    async fn resultJWT(&self) -> Option<String> { self.result_jwt.clone() }
}

#[derive(Default)]
pub struct SubscriptionShard_SignIn;
#[Subscription]
impl SubscriptionShard_SignIn {
    /// Begin sign-in flow, resulting in a JWT string being returned. (to then be passed in an `authorization` header for queries/mutations, or to the `signInAttach` endpoint for subscriptions)
    /// * `provider` - The authentication flow/website/sign-in-service that will be used. [string, options: "google", "dev"]
    /// * `jwtDuration` - How long until the generated JWT should expire, in seconds. [i64]
    /// * `preferredUsername` - Used by the "dev" provider as part of the constructed user-data. [string]
    async fn signInStart<'a>(&self, gql_ctx: &'a async_graphql::Context<'a>, input: SignInStartInput) -> impl Stream<Item = Result<SignInStartResult, SubError>> + 'a {
        let SignInStartInput { provider, jwtDuration, preferredUsername } = input;
        
        let google_client_id = ClientId::new(env::var("CLIENT_ID").expect("Missing the CLIENT_ID environment variable."));
        let google_client_secret = ClientSecret::new(env::var("CLIENT_SECRET").expect("Missing the CLIENT_SECRET environment variable."));
        let auth_url = AuthUrl::new("https://accounts.google.com/o/oauth2/v2/auth".to_string()).expect("Invalid authorization endpoint URL");
        let token_url = TokenUrl::new("https://www.googleapis.com/oauth2/v3/token".to_string()).expect("Invalid token endpoint URL");

        let referrer = try_get_referrer_from_gql_ctx(gql_ctx);
        let callback_url = get_server_url(ServerPod::AppServer, "/auth/google/callback", referrer, GetServerURL_Options { force_localhost: false, force_https: false }).unwrap();

        // Set up the config for the Google OAuth2 process.
        let client = BasicClient::new(google_client_id, Some(google_client_secret), auth_url, Some(token_url))
            // This example will be running its own server at localhost:8080. (see below for the server implementation)
            .set_redirect_uri(RedirectUrl::new(callback_url).expect("Invalid redirect URL"))
            // Google supports OAuth 2.0 Token Revocation (RFC-7009)
            .set_revocation_uri(RevocationUrl::new("https://oauth2.googleapis.com/revoke".to_string()).expect("Invalid revocation endpoint URL"));
    
        // Google supports Proof Key for Code Exchange (PKCE - https://oauth.net/2/pkce/).
        // Create a PKCE code verifier and SHA-256 encode it as a code challenge.
        let (pkce_code_challenge, pkce_code_verifier) = PkceCodeChallenge::new_random_sha256();
        //let pkce_code_verifier_as_json = pkce_code_verifier.secret();
        let pkce_code_verifier_as_json = serde_json::to_string(&pkce_code_verifier).unwrap();
    
        // Generate the authorization URL to which we'll redirect the user.
        // (The csrf_state is essentially an "attempt ID"; use this to match up this attempt's callback-data with our async code-run here.)
        let (authorize_url, csrf_state) = client
            .authorize_url(CsrfToken::new_random)
            .add_scope(Scope::new("email".to_string()))
            .add_scope(Scope::new("profile".to_string()))
            .set_pkce_challenge(pkce_code_challenge)
            .url();

        let msg_sender = &get_app_state_from_gql_ctx(gql_ctx).channel_for_sign_in_messages__sender_base;
        let mut msg_receiver = msg_sender.new_receiver();

        let base_stream = async_stream::stream! {
            match provider.as_str() {
                "dev" => {
                    if !k8s_dev() { Err(SubError::new(format!("Cannot use \"dev\" provider in non-dev k8s cluster.")))?; }
                    let preferredUsername = match preferredUsername {
                        Some(val) => val,
                        None => Err(SubError::new(format!("Must provide \"preferredUsername\" when using \"dev\" provider.")))?,
                    };

                    let fake_user = username_to_fake_user_data(preferredUsername);

                    // note: the `store_user_data_for_google_sign_in` func currently only uses these fields: email, name, picture
                    let fake_user_as_g_profile = GoogleUserInfoResult {
                        email: format!("{}@fake.com", fake_user.displayName.clone()),
                        email_verified: true,
                        family_name: fake_user.displayName.clone(),
                        given_name: fake_user.displayName.clone(),
                        locale: "en".to_owned(),
                        name: fake_user.displayName.clone(),
                        picture: "".to_owned(),
                        sub: "".to_owned(),
                    };

                    let mut anchor = DataAnchorFor1::empty(); // holds pg-client
                    let ctx = AccessorContext::new_write(&mut anchor, gql_ctx, false).await.unwrap();
                    let user_data = store_user_data_for_google_sign_in(fake_user_as_g_profile, &ctx, true).await.map_err(to_sub_err)?;
                    info!("Committing transaction...");
                    ctx.tx.commit().await.map_err(to_sub_err)?;

                    let key = get_or_create_jwt_key_hs256().await.map_err(to_sub_err)?;
                    let claims = Claims::with_custom_claims(user_data, JWTDuration::from_secs(jwtDuration.try_into().map_err(to_sub_err)?));
                    let jwt = key.authenticate(claims).map_err(to_sub_err)?;
                    info!("Generated dev JWT:{}", jwt);

                    yield Ok(SignInStartResult {
                        auth_link: None,
                        result_jwt: Some(jwt.to_string()),
                    });
                }
                "google" => {
                    yield Ok(SignInStartResult {
                        auth_link: Some(authorize_url.to_string()),
                        result_jwt: None,
                    });
                    //println!("Open this URL in your browser:\n{}\n", authorize_url.to_string());
        
                    loop {
                        match make_reliable(msg_receiver.recv(), Duration::from_millis(10)).await {
                            Err(_err) => break, // channel closed (program must have crashed), end loop
                            Ok(msg) => {
                                match msg {
                                    SignInMsg::GotCallbackData(uri) => {
                                        info!("Got callback data!{:?}", uri);
                                        let params = get_uri_params(&uri);
                                        let callback_attempt_id = params.get("state").map(|a| a.clone()).unwrap_or("n/a".to_owned());
                                        if &callback_attempt_id == csrf_state.secret() {
                                            let code_str = params.get("code").map(|a| a.clone()).unwrap_or("n/a".to_owned());
                                            let code = AuthorizationCode::new(code_str);
                                            info!("Got this run's callback data! @code:{}", code.secret());
        
                                            let pkce_code_verifier_copy = serde_json::from_str(&pkce_code_verifier_as_json).unwrap();
        
                                            // Exchange the code with a token.
                                            let token_response = client
                                                .exchange_code(code)
                                                .set_pkce_verifier(pkce_code_verifier_copy)
                                                .request_async(async_http_client).await;
        
                                            info!("Google returned the following token:\n{:?}\n", token_response);
        
                                            let token_response = token_response.unwrap();
                                            let token_str = token_response.access_token().secret();
                                            info!("Got token-str:{}", token_str);
        
                                            let params_str = rust_shared::url::form_urlencoded::Serializer::new(String::new())
                                                .append_pair("access_token", &token_str)
                                                .finish();
                                            let response_as_str = rust_shared::reqwest::get(format!("https://www.googleapis.com/oauth2/v3/userinfo?{params_str}")).await.map_err(to_sub_err)?
                                                .text().await.map_err(to_sub_err)?;
                                            
                                            let user_info = serde_json::from_str::<GoogleUserInfoResult>(&response_as_str).with_context(|| format!("Could not parse response-str as user-info struct:{}", response_as_str)).map_err(to_sub_err)?;
                                            info!("Got response user-info:{:?}", user_info);
        
                                            let mut anchor = DataAnchorFor1::empty(); // holds pg-client
                                            let ctx = AccessorContext::new_write(&mut anchor, gql_ctx, false).await.unwrap();
                                            let user_data = store_user_data_for_google_sign_in(user_info, &ctx, false).await.map_err(to_sub_err)?;
                                            info!("Committing transaction...");
                                            ctx.tx.commit().await.map_err(to_sub_err)?;
        
                                            let key = get_or_create_jwt_key_hs256().await.map_err(to_sub_err)?;
                                            //let month_in_secs = 30 * 24 * 60 * 60; // (2629800)
                                            let claims = Claims::with_custom_claims(user_data, JWTDuration::from_secs(jwtDuration.try_into().map_err(to_sub_err)?));
                                            let jwt = key.authenticate(claims).map_err(to_sub_err)?;
                                            info!("Generated JWT:{}", jwt);
        
                                            yield Ok(SignInStartResult {
                                                auth_link: Some(authorize_url.to_string()),
                                                result_jwt: Some(jwt.to_string()),
                                            });
                                        }
                                    },
                                }
                            }
                        }
                    }
                },
                _ => {
                    Err(SubError::new(format!("Invalid provider. Valid options: google, dev")))?;
                }
            }
        };
        base_stream
    }

    // todo: implement this, once authentication is required for some of the "read" operations (assuming we want an existing websocket-connection to be able to authenticate "later on") 
    // Attaches the provided sign-in data (`jwt`) to the current websocket connection, authenticating subsequent requests sent over it.
    /*async fn signInAttach<'a>(&self, gql_ctx: &'a async_graphql::Context<'a>, jwt: String) -> impl Stream<Item = Result<GenericMutation_Result, SubError>> + 'a {
        async_stream::stream! {
            let mut anchor = DataAnchorFor1::empty(); // holds pg-client
            let ctx = AccessorContext::new_read(&mut anchor, gql_ctx).await.unwrap();
            let user_info = resolve_jwt_to_user_info(&ctx, jwt).await?;

            // todo: store user-data in some place where commands and such will be able to access it (for requests/commands made on this same websocket connection, of course)

            yield Ok(GenericMutation_Result {
                message: "Command completed successfully.".to_owned(),
            });
        }
    }*/
}

}