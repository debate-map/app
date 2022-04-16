use anyhow::Error;
use flume::Sender;
use tracing::{error, info};

use crate::{GeneralMessage, pgclient::create_client, utils::type_aliases::JSONValue};

pub async fn migrate_db_to_v2(msg_sender: Sender<GeneralMessage>) -> Result<String, Error> {
    let (mut client, connection) = create_client(false).await;
    // the connection object performs the actual communication with the database, so spawn it off to run on its own
    // (maybe switch to using a shared program-wide pool, to avoid the need for this)
    let _handle = tokio::spawn(async move {
        if let Err(e) = connection.await {
            error!("connection error: {}", e);
        }
        //return connection;
    });
    
    let migration_id = "1".to_owned();
    let log = |text: &str| {
        info!("MigrateLog: {text}");
        msg_sender.send(GeneralMessage::MigrateLogMessageAdded(text.to_owned())).unwrap();
    };

    log("Starting migration to version: 2");
    let tx = client.build_transaction().isolation_level(tokio_postgres::IsolationLevel::Serializable).start().await?;

    log("Adding new column...");
    tx.execute(r#"ALTER TABLE app_public."nodeRevisions" ADD attachments jsonb NOT NULL DEFAULT '[]'::json;"#, &[]).await?;

    log("Updating rows...");
    let rows = tx.query(r#"SELECT * from app_public."nodeRevisions""#, &[]).await?;
    for row in rows {
        let id: String = row.get("id");
        let equation_val: JSONValue = row.try_get("equation").unwrap_or(JSONValue::Null);
        let references_val: JSONValue = row.try_get("references").unwrap_or(JSONValue::Null);
        let quote_val: JSONValue = row.try_get("quote").unwrap_or(JSONValue::Null);
        let media_val: JSONValue = row.try_get("media").unwrap_or(JSONValue::Null);
        
        tx.execute(r#"
            UPDATE app_public."nodeRevisions"
            SET "attachments"='[]'::jsonb
            WHERE id=$1;
        "#, &[&id]).await?;
        
        if !equation_val.is_null() || !references_val.is_null() || !quote_val.is_null() || !media_val.is_null() {
            let mut attachment_map = serde_json::Map::new();
            if !equation_val.is_null() { attachment_map.insert("equation".to_owned(), equation_val); }
            if !references_val.is_null() { attachment_map.insert("references".to_owned(), references_val); }
            if !quote_val.is_null() { attachment_map.insert("quote".to_owned(), quote_val); }
            if !media_val.is_null() { attachment_map.insert("media".to_owned(), media_val); }

            let attachment = JSONValue::Object(attachment_map);
            let attachments_array = JSONValue::Array(vec![attachment]);

            tx.execute(r#"
                UPDATE app_public."nodeRevisions"
                SET "attachments"=$1
                WHERE id=$2;
            "#, &[&attachments_array, &id]).await?;
        }
    }

    log("Deleting old columns...");
    tx.execute(r#"ALTER TABLE app_public."nodeRevisions" DROP COLUMN equation;"#, &[]).await?;
    tx.execute(r#"ALTER TABLE app_public."nodeRevisions" DROP COLUMN media;"#, &[]).await?;
    tx.execute(r#"ALTER TABLE app_public."nodeRevisions" DROP COLUMN "references";"#, &[]).await?;
    tx.execute(r#"ALTER TABLE app_public."nodeRevisions" DROP COLUMN "quote";"#, &[]).await?;

    log("Committing transaction...");
    tx.commit().await?;
    log("Migration complete!");
    return Ok(migration_id);
}