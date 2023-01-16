use rust_shared::anyhow::Error;

use crate::{utils::db::accessors::AccessorContext, db::{maps::{get_map, Map}, commands::_command::upsert_db_entry_by_id_for_struct, users::{User, get_user}}};

pub async fn increment_edit_counts_if_valid(ctx: &AccessorContext<'_>, user: Option<&User>, map_id: Option<String>, is_root: bool) -> Result<(), Error> {
    if !is_root {
        return Ok(());
    }
    if let Some(user) = user {
        increment_user_edits(ctx, user.id.as_str()).await?;
    }
    if let Some(map_id) = map_id {
        increment_map_edits(ctx, &map_id).await?;
    }
    Ok(())
}
pub async fn increment_user_edits(ctx: &AccessorContext<'_>, user_id: &str) -> Result<(), Error> {
    let old_data = get_user(ctx, &user_id).await?;
    let new_data = User {
        edits: old_data.edits + 1,
        ..old_data
    };

    upsert_db_entry_by_id_for_struct(&ctx, "users".to_owned(), user_id.to_string(), new_data).await?;

    Ok(())
}
pub async fn increment_map_edits(ctx: &AccessorContext<'_>, map_id: &str) -> Result<(), Error> {
    let old_data = get_map(ctx, &map_id).await?;
    let new_data = Map {
        edits: old_data.edits + 1,
        ..old_data
    };

    upsert_db_entry_by_id_for_struct(&ctx, "maps".to_owned(), map_id.to_string(), new_data).await?;

    Ok(())
}