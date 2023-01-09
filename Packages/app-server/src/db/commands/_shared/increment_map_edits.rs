use rust_shared::anyhow::Error;

use crate::{utils::db::accessors::AccessorContext, db::{maps::{get_map, Map}, commands::_command::set_db_entry_by_id_for_struct}};

pub async fn increment_map_edits_if_valid(ctx: &AccessorContext<'_>, map_id: Option<String>, is_root: bool) -> Result<(), Error> {
    if !is_root {
        return Ok(());
    }
    match map_id {
        None => Ok(()),
        Some(map_id) => Ok(increment_map_edits(ctx, &map_id).await?)
    }
}
pub async fn increment_map_edits(ctx: &AccessorContext<'_>, map_id: &str) -> Result<(), Error> {
    let old_data = get_map(ctx, &map_id).await?;
    let new_data = Map {
        edits: old_data.edits + 1,
        ..old_data
    };

    set_db_entry_by_id_for_struct(&ctx, "maps".to_owned(), map_id.to_string(), new_data).await?;

    Ok(())
}