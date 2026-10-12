use crate::anyhow::{anyhow, ensure, Context, Error};
use crate::async_graphql::{async_stream, scalar, EmptySubscription, InputObject, Object, OutputType, Schema, SimpleObject, Subscription, ID};
use crate::indoc::indoc;
use crate::postgres_protocol::message;
use crate::rust_macros::wrap_slow_macros;
use crate::serde::{Deserialize, Serialize};
use crate::serde_json::json;
use crate::tokio_postgres::Client;
use crate::tracing::{error, info, warn};
use crate::utils::general::extensions::ToOwnedV;
use crate::utils::general::type_aliases::JSONValue;
use crate::{
	async_graphql, serde_json,
	utils::errors::errors::{to_sub_err, GQLError, SubError},
};
use crate::{get_app_state_from_gql_ctx, get_user_info_from_gql_ctx, get_user_jwt_data_from_gql_ctx, time_since_epoch_ms_i64, to_sub_err_in_stream, try_get_user_jwt_data_from_gql_ctx, AccessorContext, DataAnchorFor1, GenericResponse};
use futures_util::{stream, Future, Stream, StreamExt, TryFutureExt};
use std::env;
use std::path::Path;
use std::{pin::Pin, task::Poll, time::Duration};

wrap_slow_macros! {

// mutations
// ==========

#[derive(SimpleObject, Clone, Serialize, Deserialize)]
pub struct ProcessMessage {
	pub userChannel: String,
	pub senderProcessId: String,
	pub sendTime: i64,
	pub message: JSONValue,
}

#[derive(InputObject, Clone, Serialize, Deserialize)]
pub struct ProcessMessageInput {
	pub userChannel: String,
	pub senderProcessId: String,
	pub message: JSONValue,
}

#[derive(InputObject, Clone, Serialize, Deserialize)]
pub struct SendProcessMessageInput {
	pub message: ProcessMessageInput,
}

#[derive(Default)]
pub struct MutationShard_ProcessMessages;
#[Object]
impl MutationShard_ProcessMessages {
	async fn sendProcessMessage(&self, gql_ctx: &async_graphql::Context<'_>, input: SendProcessMessageInput) -> Result<GenericResponse, Error> {
		let actor_id = {
			let mut anchor = DataAnchorFor1::empty(); // holds pg-client
			let ctx = AccessorContext::new_read(&mut anchor, gql_ctx, false).await?;
			let actor = get_user_info_from_gql_ctx(&gql_ctx, &ctx).await?;
			ensure!(actor.id.0 == input.message.userChannel, "Users can only access the process-messages channel for their own account/user.");
			actor.id.0
		};

		// have server create the final message object itself, to ensure some properties are set properly (eg. the "user" and "sendTime" fields)
		let message_final = ProcessMessage {
			userChannel: actor_id,
			senderProcessId: input.message.senderProcessId,
			sendTime: time_since_epoch_ms_i64(),
			message: input.message.message,
		};

		let app_state = get_app_state_from_gql_ctx(gql_ctx);
		if let Err(err) = app_state.channel_for_process_messages__sender_base.send(message_final) {
			info!("User tried to send process-message, but there were no receivers. @msg:{:?}", err.0.message);
		}
		Ok(GenericResponse::new())
	}
}

// subscriptions
// ==========

#[derive(InputObject, Clone, Serialize, Deserialize)]
pub struct NewProcessMessagesInput {
	pub userChannel: String, // not really necessary to specify this atm (since users can only watch their own account's process-messages "channel"), but may be useful in future
}

#[derive(SimpleObject, Clone)] pub struct ListChange_ProcessMessages {
	//pub meta: ListChangeMeta,
	//pub data: Vec<Entity>
	pub newMessage: ProcessMessage,
}

#[derive(Default)]
pub struct SubscriptionShard_ProcessMessages;
#[Subscription]
impl SubscriptionShard_ProcessMessages {
	async fn newProcessMessages<'a>(&self, gql_ctx: &'a async_graphql::Context<'a>, input: NewProcessMessagesInput) -> impl Stream<Item = Result<ListChange_ProcessMessages, SubError>> + 'a {
		let app_state = get_app_state_from_gql_ctx(gql_ctx).clone();
		//let jwt_data = try_get_user_jwt_data_from_gql_ctx(gql_ctx).await.unwrap_or_else(|_| None);
		let mut process_message_receiver = app_state.channel_for_process_messages__sender_base.subscribe();

		let init_err: Result<(), Error> = try {
			let mut anchor = DataAnchorFor1::empty(); // holds pg-client
			//let ctx = match AccessorContext::new_read(&mut anchor, gql_ctx, false).await { Ok(a) => a, Err(e) => return to_sub_err_in_stream::<ProcessMessage, Error>(e) };
			let ctx = AccessorContext::new_read(&mut anchor, gql_ctx, false).await?;
			let actor = get_user_info_from_gql_ctx(&gql_ctx, &ctx).await?;
			if actor.id.0 != input.userChannel {
				Err(SubError::new("Users can only access the process-messages channel for their own account/user.".o()))?;
			}
		};
		/*if let Err(e) = init_err {
			return to_sub_err_in_stream::<ProcessMessage, Error>(e);
		}*/

		tokio::spawn(async move {
			let base_stream = async_stream::try_stream! {
				if let Err(e) = init_err {
					Err(to_sub_err(e))?;
				}

				loop {
					let new_message = match process_message_receiver.recv().await {
						Ok(a) => a,
						Err(_) => break, // if unwrap fails, break loop (since senders are dead anyway)
					};
					// if the new-message's user/channel is different than this stream's user, ignore it
					if new_message.userChannel != input.userChannel {
						continue;
					}
					yield ListChange_ProcessMessages { newMessage: new_message };
				}
			};
			base_stream
		})
		.await
		.unwrap()
	}
}

}

/*async fn newProcessMessages(&self, gql_ctx: &async_graphql::Context<'_>, input: NewProcessMessagesInput) -> impl Stream<Item = Result<ProcessMessage, SubError>> + '_ {
	...

	// Create the stream without capturing gql_ctx
	let user = input.user.clone();
	stream::unfold(process_message_receiver, move |mut receiver| async move {
		match receiver.recv().await {
			Ok(message) => Some((Ok(message), receiver)),
			Err(_) => Some((Err(SubError::new("Process-messages channel closed.".to_owned())), receiver)),
		}
	}).boxed()
}*/
