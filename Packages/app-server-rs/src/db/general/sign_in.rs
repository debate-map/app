use std::collections::HashMap;
use std::env;
use std::time::Duration;

use deadpool_postgres::tokio_postgres::Row;
use once_cell::sync::{Lazy, OnceCell};
use rust_shared::hyper::{Request, Body, Method};
use oauth2::basic::BasicClient;
use oauth2::reqwest::async_http_client;
use oauth2::{PkceCodeChallenge, RevocationUrl, RedirectUrl, TokenUrl, AuthUrl, Scope, CsrfToken, ClientSecret, ClientId, AuthorizationCode, StandardRevocableToken};
use oauth2::TokenResponse;
use rust_shared::anyhow::{Context, anyhow, Error};
use rust_shared::async_graphql::{Object, Schema, Subscription, ID, async_stream, OutputType, scalar, EmptySubscription, SimpleObject};
use futures_util::{Stream, TryStreamExt};
use rust_shared::axum::response::IntoResponse;
use rust_shared::axum::{Router, AddExtensionLayer, response};
use rust_shared::axum::extract::{Extension, Path};
use rust_shared::axum::routing::get;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde::{Serialize, Deserialize};
use rust_shared::serde_json::json;
use rust_shared::utils::db::uuid::{new_uuid_v4_as_b64, new_uuid_v4_as_b64_id};
use rust_shared::utils::db_constants::SYSTEM_POLICY_PUBLIC_UNGOVERNED_NAME;
use rust_shared::utils::futures::make_reliable;
use rust_shared::utils::general::get_uri_params;
use rust_shared::utils::time::time_since_epoch_ms_i64;
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::utils::_k8s::{get_or_create_k8s_secret};
use rust_shared::{async_graphql, serde_json, SubError, to_sub_err, to_sub_err_in_stream};
use tracing::info;
use jwt_simple::prelude::{HS256Key, Claims, MACLike};

use crate::db::_general::GenericMutation_Result;
use crate::db::access_policies::{get_access_policy, get_system_access_policy};
use crate::db::commands::_command::set_db_entry_by_id_for_struct;
use crate::db::general::subtree_collector::params;
use crate::db::user_hiddens::UserHidden;
use crate::db::users::{get_user, User, PermissionGroups};
use crate::links::proxy_to_asjs::HyperClient;
use crate::store::storage::{AppStateWrapper, SignInMsg};
use crate::utils::db::accessors::{AccessorContext, get_db_entries};
use crate::utils::general::data_anchor::DataAnchorFor1;
use crate::utils::general::general::body_to_str;
use crate::utils::type_aliases::{ABSender, JWTDuration};

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

struct SignInStart_Result {
    auth_link: Option<String>,
    result_jwt: Option<String>,
}
#[Object]
impl SignInStart_Result {
    async fn instructions(&self) -> Vec<String> {
        vec![
            "1) TODO".to_owned(),
            "2) TODO".to_owned(),
            "3) TODO".to_owned(),
        ]
    }
    async fn authLink(&self) -> Option<String> { self.auth_link.clone() }
    async fn resultJWT(&self) -> Option<String> { self.result_jwt.clone() }
}

#[derive(Default)]
pub struct SubscriptionShard_SignIn;
#[Subscription]
impl SubscriptionShard_SignIn {
    /// Begin sign-in flow, resulting in a JWT string being returned. (to then be used with `signInAttach`)
    /// * `provider` - The authentication flow/website/sign-in-service that will be used. [string, options: "google"]
    /// * `jwtDuration` - How long until the generated JWT should expire, in minutes. [i64]
    async fn signInStart<'a>(&self, gql_ctx: &'a async_graphql::Context<'a>, provider: String, jwtDuration: i64) -> impl Stream<Item = Result<SignInStart_Result, SubError>> + 'a {
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
            .add_scope(Scope::new("email".to_string()))
            .add_scope(Scope::new("profile".to_string()))
            .set_pkce_challenge(pkce_code_challenge)
            .url();

        let msg_sender = &gql_ctx.data::<AppStateWrapper>().unwrap().channel_for_sign_in_messages__sender_base;
        let mut msg_receiver = msg_sender.new_receiver();

        let base_stream = async_stream::stream! {
            if provider != "google" { yield Err(SubError::new(format!("Invalid provider. Valid options: google"))); return; }

            yield Ok(SignInStart_Result {
                auth_link: Some(authorize_url.to_string()),
                result_jwt: None,
            });
            // temp; log to console for manual opening
            println!("Open this URL in your browser:\n{}\n", authorize_url.to_string());

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
                                    let ctx = AccessorContext::new_write(&mut anchor, gql_ctx).await.unwrap();

                                    let user_data = store_user_data_for_google_sign_in(user_info, &ctx).await.map_err(to_sub_err)?;

                                    info!("Committing transaction...");
                                    ctx.tx.commit().await.map_err(to_sub_err)?;

                                    let key = get_or_create_jwt_key_hs256().await.map_err(to_sub_err)?;
                                    let month_in_secs = 30 * 24 * 60 * 60;
                                    let claims = Claims::with_custom_claims(user_data, JWTDuration::from_secs(month_in_secs));
                                    let jwt = key.authenticate(claims).map_err(to_sub_err)?;
                                    info!("Generated JWT:{}", jwt);

                                    yield Ok(SignInStart_Result {
                                        auth_link: Some(authorize_url.to_string()),
                                        result_jwt: Some(jwt.to_string()),
                                    });
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
        // todo: validate JWT, and extract user-data

        // todo: store user-data in some place where commands and such will be able to access it (for requests/commands made on this same websocket connection, of course)

        async_stream::stream! {
            yield GenericMutation_Result {
                message: "Command completed successfully.".to_owned(),
            };
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct GoogleUserInfoResult {
    email: String,
    email_verified: bool,
    family_name: String,
    given_name: String,
    locale: String,
    name: String,
    picture: String,
    sub: String, 
}

}

pub async fn get_or_create_jwt_key_hs256() -> Result<HS256Key, Error> {
    let key_str = get_or_create_jwt_key_hs256_str().await?;
    let key_str_bytes = base64::decode(key_str)?;
    let key = HS256Key::from_bytes(&key_str_bytes);
    Ok(key)
}
static JWT_KEY_HS256_STR: OnceCell<String> = OnceCell::new();
/// Retrieves and/or creates the hs256 secret-key for use in generating JWTs.
/// Why do retrieval manually rather than having k8s import it as an environment-variable at startup?
/// Because k8s converts the base64 string into a utf8 string, which makes conversion complicated. (we want to decode it simply as a raw byte-array, for passing to HS256Key::from_bytes)
pub async fn get_or_create_jwt_key_hs256_str() -> Result<String, Error> {
    // first, try to read the key from a global variable (in case this func has already been run)
    if let Some(key_as_base64_str) = JWT_KEY_HS256_STR.get() {
        //info!("Retrieved secret key from global-var:{:?}", key_as_base64_str);
        return Ok(key_as_base64_str.to_owned());
    }
    
    // create a new key, and try to store it as a k8s secret
    let new_secret_data_if_missing = json!({
        "key": base64::encode(HS256Key::generate().to_bytes()),
    });
    let secret = get_or_create_k8s_secret("dm-jwt-secret-hs256".to_owned(), new_secret_data_if_missing).await?;
    let key_as_base64_str = secret.data["key"].as_str().ok_or(anyhow!("The \"key\" field is missing!"))?;
    //info!("Read/created secret key through k8s api:{:?}", key_as_base64_str);

    // now that we have the key, store it in global-var for faster retrieval (use get_or_init for safe handling in case this func was called by two threads concurrently)
    let result = JWT_KEY_HS256_STR.get_or_init(|| key_as_base64_str.to_owned());
    
    //Ok(key_as_base64_str.to_owned())
    Ok(result.to_owned())
} 

pub async fn store_user_data_for_google_sign_in(profile: GoogleUserInfoResult, ctx: &AccessorContext<'_>) -> Result<User, Error> {
    let user_hiddens_with_email: Vec<UserHidden> = get_db_entries(ctx, "userHiddens", &Some(json!({
        "email": {"equalTo": profile.email}
    }))).await?;
    match user_hiddens_with_email.len() {
        0 => {},
        1 => {
            let existing_user_hidden = user_hiddens_with_email.get(0).ok_or(anyhow!("Row missing somehow?"))?;
            info!("Found existing user for email:{}", profile.email);
            let existing_user = get_user(ctx, &existing_user_hidden.id).await
                .map_err(|_| anyhow!(r#"Could not find user with id matching that of the entry in userHiddens ({}), which was found based on your provided account's email ({})."#, existing_user_hidden.id.as_str(), existing_user_hidden.email))?;
            info!("Also found user-data:{:?}", existing_user);
            return Ok(existing_user);
        },
        _ => return Err(anyhow!("More than one user found with same email! This shouldn't happen.")),
    }

	info!(r#"User not found for email "{}". Creating new."#, profile.email);

	let mut permissionGroups = PermissionGroups {basic: true, verified: true, r#mod: false, admin: false};

	// maybe temp; make first (non-system) user an admin
    let users_count_rows: Vec<Row> = ctx.tx.query_raw("SELECT count(*) FROM (SELECT 1 FROM users LIMIT 10) t;", params(&[])).await?.try_collect().await?;
    let users_count: i64 = users_count_rows.get(0).ok_or(anyhow!("No rows"))?.try_get(0)?;
	if users_count <= 1 { //|| forceAsAdmin {
		info!("First non-system user signing-in; marking as admin.");
		permissionGroups.r#mod = true;
        permissionGroups.admin = true;
	}

    let profile_clone = profile.clone();
	let user = User {
        id: new_uuid_v4_as_b64_id(),
		displayName: profile.name,
		permissionGroups,
		photoURL: Some(profile.picture),
        joinDate: time_since_epoch_ms_i64(),
        edits: 0,
        lastEditAt: None,
	};
    let new_user_id = user.id.as_str().to_owned();
	let default_policy = get_system_access_policy(ctx, &SYSTEM_POLICY_PUBLIC_UNGOVERNED_NAME).await?;
	let user_hidden = UserHidden {
        id: new_uuid_v4_as_b64_id(),
		email: profile.email,
		providerData: serde_json::to_value(vec![profile_clone])?,
		lastAccessPolicy: Some(default_policy.id.as_str().to_owned()),
        backgroundID: None,
        backgroundCustom_enabled: None,
        backgroundCustom_color: None,
        backgroundCustom_url: None,
        backgroundCustom_position: None,
        addToStream: true,
        extras: serde_json::Value::Object(serde_json::Map::new()),
	};

    set_db_entry_by_id_for_struct(&ctx, "users".to_owned(), user.id.to_string(), user).await?;
    set_db_entry_by_id_for_struct(&ctx, "userHiddens".to_owned(), user_hidden.id.to_string(), user_hidden).await?;
	info!("Creation of new user semi-complete! NewID:{}", new_user_id); // "semi" complete, because transaction hasn't been committed yet

    let result = get_user(ctx, new_user_id.as_str()).await?;
	info!("User result:{:?}", result);
	Ok(result)
}