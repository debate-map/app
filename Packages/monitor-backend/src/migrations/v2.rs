use flume::Sender;

use crate::GeneralMessage;

pub async fn migrate_db_to_v2(msg_sender: Sender<GeneralMessage>) -> String {
    let migration_id = "1".to_owned();
    
    let log = |text: &str| {
        println!("MigrateLog: {text}");
        msg_sender.send(GeneralMessage::MigrateLogMessageAdded(text.to_owned())).unwrap();
    };

    log("Test1");
    log("Test2");

    return migration_id;
}