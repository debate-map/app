use std::collections::HashMap;
use std::env;
use std::time::Duration;

use rust_shared::hyper::{Request, Body, Method};
use oauth2::basic::BasicClient;
use oauth2::reqwest::async_http_client;
use oauth2::{PkceCodeChallenge, RevocationUrl, RedirectUrl, TokenUrl, AuthUrl, Scope, CsrfToken, ClientSecret, ClientId, AuthorizationCode, StandardRevocableToken};
use oauth2::TokenResponse;
use rust_shared::anyhow::Context;
use rust_shared::async_graphql::{Object, Schema, Subscription, ID, async_stream, OutputType, scalar, EmptySubscription, SimpleObject};
use futures_util::{Stream};
use rust_shared::axum::response::IntoResponse;
use rust_shared::axum::{Router, AddExtensionLayer, response};
use rust_shared::axum::extract::{Extension, Path};
use rust_shared::axum::routing::get;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use rust_shared::utils::futures::make_reliable;
use rust_shared::utils::general::get_uri_params;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::{async_graphql, serde_json, SubError, to_sub_err};
use tracing::info;

use crate::db::_general::GenericMutation_Result;
use crate::links::proxy_to_asjs::HyperClient;
use crate::store::storage::{AppStateWrapper, SignInMsg};
use crate::utils::general::general::body_to_str;
use crate::utils::type_aliases::ABSender;

async fn auth_google_callback(Extension(state): Extension<AppStateWrapper>, req: Request<Body>) -> impl IntoResponse {
    let uri = req.uri();
    let params = get_uri_params(uri);
    let attempt_id = params.get("state").map(|a| a.clone()).unwrap_or("n/a".to_owned());

    info!("Got uri:{:?} @attemptID:{}", uri, attempt_id);
    state.channel_for_sign_in_messages__sender_base.broadcast(SignInMsg::GotCallbackData(uri.clone())).await;
    response::Html(format!("Data has been broadcast through the sign-in-message channel... (you can close this page now)"))
}

pub async fn extend_router(app: Router, storage_wrapper: AppStateWrapper) -> Router {
    let result = app
        .route("/auth/google/callback-new", get(auth_google_callback))
        .layer(AddExtensionLayer::new(storage_wrapper));
    result
}

wrap_slow_macros!{

// queries
// ==========

// mutations
// ==========

// subscriptions
// ==========

struct SignInStart_Result {}
#[Object]
impl SignInStart_Result {
    async fn instructions(&self) -> Vec<String> {
        vec![
            "1) TODO".to_owned(),
            "2) TODO".to_owned(),
            "3) TODO".to_owned(),
        ]
    }
    async fn authLink(&self) -> String {
        // todo
        "".to_owned()
    }
    async fn resultJWT(&self) -> String {
        // todo
        "".to_owned()
    }
}

#[derive(Default)]
pub struct SubscriptionShard_SignIn;
#[Subscription]
impl SubscriptionShard_SignIn {
    /// Begin sign-in flow, resulting in a JWT string being returned. (to then be used with `signInAttach`)
    /// * `provider` - The authentication flow/website/sign-in-service that will be used. [string, options: "google"]
    /// * `jwtDuration` - How long until the generated JWT should expire, in minutes. [i64]
    async fn signInStart(&self, ctx: &async_graphql::Context<'_>, provider: String, jwtDuration: i64)
        //-> impl Stream<Item = SignInStart_Result>
        -> impl Stream<Item = Result<SignInStart_Result, SubError>>
    {
        let google_client_id = ClientId::new(env::var("CLIENT_ID").expect("Missing the CLIENT_ID environment variable."));
        let google_client_secret = ClientSecret::new(env::var("CLIENT_SECRET").expect("Missing the CLIENT_SECRET environment variable."));
        let auth_url = AuthUrl::new("https://accounts.google.com/o/oauth2/v2/auth".to_string()).expect("Invalid authorization endpoint URL");
        let token_url = TokenUrl::new("https://www.googleapis.com/oauth2/v3/token".to_string()).expect("Invalid token endpoint URL");

        // Set up the config for the Google OAuth2 process.
        let client = BasicClient::new(google_client_id, Some(google_client_secret), auth_url, Some(token_url))
            // This example will be running its own server at localhost:8080. (see below for the server implementation)
            .set_redirect_uri(RedirectUrl::new(format!("http://localhost:5110/auth/google/callback-new")).expect("Invalid redirect URL"))
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
            // This example is requesting access to the "calendar" features and the user's profile.
            //.add_scope(Scope::new("https://www.googleapis.com/auth/calendar".to_string()))
            //.add_scope(Scope::new("https://www.googleapis.com/auth/plus.me".to_string()))
            //.add_scope(Scope::new("https://www.googleapis.com/auth/profile".to_string()))
            //.add_scope(Scope::new("https://www.googleapis.com/auth/userinfo.profile".to_string()))
            .add_scope(Scope::new("email".to_string()))
            .add_scope(Scope::new("profile".to_string()))
            .set_pkce_challenge(pkce_code_challenge)
            .url();
    
        println!(
            "Open this URL in your browser:\n{}\n",
            authorize_url.to_string()
        );

        //let msg_receiver = ctx.data::<Receiver<SignInMessage>>().unwrap();
        //let msg_sender = ctx.data::<ABSender<SignInMsg>>().unwrap();
        let msg_sender = &ctx.data::<AppStateWrapper>().unwrap().channel_for_sign_in_messages__sender_base;
        //let mut msg_receiver = msg_sender.subscribe();
        //let mut temp = msg_sender.subscribe().peekable();
        let mut msg_receiver = msg_sender.new_receiver();

        let base_stream = async_stream::stream! {
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
                                        //.set_pkce_verifier(pkce_code_verifier)
                                        .set_pkce_verifier(pkce_code_verifier_copy)
                                        .request_async(async_http_client).await;

                                    info!("Google returned the following token:\n{:?}\n", token_response);

                                    let token_response = token_response.unwrap();
                                    let token_str = token_response.access_token().secret();
                                    info!("Got token-str:{}", token_str);

                                    let params_str = rust_shared::url::form_urlencoded::Serializer::new(String::new())
                                        .append_pair("access_token", &token_str)
                                        .finish();

                                    /*let request = hyper::Request::builder()
                                        .method(Method::GET)
                                        .uri(format!("https://www.googleapis.com/oauth2/v3/userinfo{params_str}"))
                                        .body(Body::from(""))
                                        .unwrap();
                                    // one example of why this can fail: if the app-server-js pod crashed
                                    let client = HyperClient::new();
                                    let response = client.request(request).await.with_context(|| "Error occurred while trying to send _PassConnectionID message to app-server-js.").map_err(to_sub_err)?;
                                    let response_as_str = body_to_str(response.into_body()).await.with_context(|| "Could not convert response into string.").map_err(to_sub_err)?;*/
                                    
                                    let response_as_str = rust_shared::reqwest::get(format!("https://www.googleapis.com/oauth2/v3/userinfo?{params_str}"))
                                        .await.map_err(to_sub_err)?
                                        .text()
                                        .await.map_err(to_sub_err)?;
                                    
                                    // example str: {"data":{"_PassConnectionID":{"userID":"ABC123ABC123ABC123ABC1"}}}
                                    let response_as_json = serde_json::from_str::<JSONValue>(&response_as_str).with_context(|| format!("Could not parse response-str as json:{}", response_as_str)).map_err(to_sub_err)?;
                                    
                                    info!("Got response json:{:?}", response_as_json);

                                    yield Ok(SignInStart_Result {});
                                }
                            },
                        }
                    }
                }
            }
        };
        base_stream
    }

    /// Attaches the provided sign-in data (`jwt`) to the current websocket connection, authenticating subsequent requests sent over it.
    async fn signInAttach(&self, _ctx: &async_graphql::Context<'_>, jwt: String) -> impl Stream<Item = GenericMutation_Result> {
        // todo

        async_stream::stream! {
            yield GenericMutation_Result {
                message: "Command completed successfully.".to_owned(),
            };
        }
    }
}

}