use rust_shared::async_graphql::ID;

use crate::db::users::{User, PermissionGroups};

fn username_to_fake_slug_id(username: &str) -> String {
    let prefix_segment = "fakeUserData".to_string();
    let username_segment_max_length = 22 - (prefix_segment.len() + 1);

    let username_segment = username.replace(|c: char| !c.is_ascii_alphanumeric(), "_");
    assert!(username_segment.len() <= username_segment_max_length, "Fake username is too long!");

    let gap_size = 22 - prefix_segment.len() - username_segment.len();
    prefix_segment + &"_".repeat(gap_size) + &username_segment
}

pub fn username_to_fake_user_data(username: String) -> User {
    return User {
        id: ID(username_to_fake_slug_id(&username)),
        displayName: username,
        edits: 0,
        joinDate: 1,
        lastEditAt: None,
        permissionGroups: PermissionGroups {basic: true, verified: true, r#mod: true, admin: true},
        photoURL: None,
    };
}