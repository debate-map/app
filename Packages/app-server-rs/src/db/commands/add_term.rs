use rust_shared::async_graphql::{ID, SimpleObject};
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::serde_json::{Value, json};
use rust_shared::utils::db_constants::SYSTEM_USER_ID;
use rust_shared::{async_graphql, serde_json, anyhow};
use rust_shared::async_graphql::{Object};
use rust_shared::utils::type_aliases::JSONValue;
use rust_shared::anyhow::{anyhow, Error};
use rust_shared::{time_since_epoch_ms_i64};
use rust_shared::serde::{Deserialize};
use tracing::info;

use crate::db::terms::{Term, TermInput};
use crate::utils::db::accessors::AccessorContext;
use rust_shared::utils::db::uuid::new_uuid_v4_as_b64;
use crate::utils::general::data_anchor::{DataAnchorFor1};

use super::_command::{set_db_entry_by_id_for_struct, UserInfo};

wrap_slow_macros!{

#[derive(Deserialize)]
pub struct AddTermPayload {
	term: TermInput,
}

#[derive(SimpleObject)]
pub struct AddTermReturnData {
	id: String,
}

#[derive(Default)]
pub struct MutationShard_AddTerm;
#[Object]
impl MutationShard_AddTerm {
    //async fn addTerm(&self, gql_ctx: &async_graphql::Context<'_>, payload: JSONValue) -> Result<AddTermReturnData, Error> {
	#[graphql(name = "AddTerm")]
	async fn add_term(&self, gql_ctx: &async_graphql::Context<'_>, term_: TermInput) -> Result<AddTermReturnData, Error> {
        let user_info = UserInfo { id: SYSTEM_USER_ID.to_string() }; // temp
		let mut anchor = DataAnchorFor1::empty(); // holds pg-client
		let ctx = AccessorContext::new_write(&mut anchor, gql_ctx).await?;
		//Ok(add_term(gql_ctx, user_info, payload).await?)
		let mut return_data = AddTermReturnData {id: "<tbd>".to_owned()};
		
		info!("part 1");
		/*let term = Term {
			// added
			id: ID(new_uuid_v4_as_b64()),
			creator: user_info.id,
			createdAt: time_since_epoch_ms_i64(),
			.. term_   // unfortunately, this fails; Rust requires the types to match, not just have compatible fields
		};*/
		/*let mut term_as_val = serde_json::to_value(term_).unwrap();
		let term_fields = term_as_val.as_object_mut().unwrap();
		term_fields.insert("id".to_owned(), json!(new_uuid_v4_as_b64()));
		term_fields.insert("creator".to_owned(), json!(user_info.id));
		term_fields.insert("createdAt".to_owned(), json!(time_since_epoch_ms_i64()));
		let term: Term = serde_json::from_value(Value::Object(term_fields.clone())).unwrap();*/
		let term = Term {
			// pass-through
			accessPolicy: term_.accessPolicy,
			attachments: term_.attachments,
			definition: term_.definition,
			disambiguation: term_.disambiguation,
			forms: term_.forms,
			name: term_.name,
			note: term_.note,
			r#type: term_.r#type,
			// set by server
			id: ID(new_uuid_v4_as_b64()),
			creator: user_info.id,
			createdAt: time_since_epoch_ms_i64(),
		};
		return_data.id = term.id.to_string();

		validate_term(&term)?;
		set_db_entry_by_id_for_struct(&ctx, "terms".to_owned(), term.id.to_string(), term).await?;

		info!("Committing transaction...");
		ctx.tx.commit().await?;
		info!("Add-term command complete!");
		Ok(return_data)
    }
}

}

/*pub async fn add_term(gql_ctx: &async_graphql::Context<'_>, user_info: UserInfo, payload_raw: JSONValue) -> Result<AddTermReturnData, Error> {
	let payload: AddTermPayload = serde_json::from_value(payload_raw)?;
	let AddTermPayload {mut term} = payload;
	...
}*/

// todo: maybe use a different way to do validation that is "beyond rust's type-system" (eg. by switching to using json-schema again)
pub fn validate_term(term: &Term) -> Result<(), Error> {
	x_is_one_of(term.r#type.as_str(), &["commonNoun", "properNoun", "adjective", "verb", "adverb"])?;
	Ok(())
}

// utility functions (ie. lightweight versions of some checks that used to be done by json-schema)
/*pub fn x_is_one_of<T: Eq + std::fmt::Debug>(x: &T, list: Vec<T>) -> Result<(), Error> {
	for val in &list {
		if val.eq(x) {
			return Ok(());
		}
	}
	Err(anyhow!("Supplied value for field does not match any of the valid options:{:?}", list))
}*/
pub fn x_is_one_of<T: Eq + std::fmt::Debug + ?Sized>(x: &T, list: &[&T]) -> Result<(), Error> {
	for val in list {
		if val.eq(&x) {
			return Ok(());
		}
	}
	Err(anyhow!("Supplied value for field does not match any of the valid options:{:?}", list))
}