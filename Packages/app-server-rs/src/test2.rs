use std::sync::Arc;

use async_graphql::SimpleObject;
use tokio::sync::Mutex;
use rust_macros::SimpleObject_Cached;

// for testing cargo-check times
pub fn test1() {
    println!("123");
}

type ID = String;

#[derive(SimpleObject_Cached)]
pub struct Map {
    id: ID,
    accessPolicy: String,
    name: String,
    note: Option<String>,
    noteInline: Option<bool>,
    rootNode: String,
    defaultExpandDepth: i32,
    nodeAccessPolicy: Option<String>,
    featured: Option<bool>,
    editors: Vec<String>,
    creator: String,
    createdAt: i64,
    edits: i32,
    editedAt: Option<i64>,
    extras: serde_json::Value,
}
/*#[derive(SimpleObject)]
pub struct Term {
    id: ID,
    accessPolicy: String,
    creator: String,
    createdAt: i64,
    name: String,
    forms: Vec<String>,
    disambiguation: Option<String>,
    r#type: String,
    definition: String,
    note: Option<String>,
    attachments: Vec<serde_json::Value>,
}
#[derive(SimpleObject)]
pub struct AccessPolicy {
    id: ID,
    creator: String,
    createdAt: i64,
    name: String,
    permissions: serde_json::Value,
    permissions_userExtends: serde_json::Value,
}
#[derive(SimpleObject)]
pub struct Media {
    id: ID,
    accessPolicy: String,
    creator: String,
    createdAt: i64,
    name: String,
    r#type: String,
    url: String,
    description: String,
}
#[derive(SimpleObject)]
pub struct CommandRun {
    id: ID,
    actor: String,
    runTime: i64,
    public_base: bool,
    commandName: String,
    commandPayload: serde_json::Value,
    returnData: serde_json::Value,
    rlsTargets: serde_json::Value,
}
#[derive(SimpleObject)]
pub struct Proposal {
    id: ID,
    r#type: String,
    title: String,
    text: String,
    creator: String,
    createdAt: i64,
    editedAt: Option<i64>,
    completedAt: Option<i64>,
}

#[derive(SimpleObject)]
pub struct UserInfo {
    id: ID,
    proposalsOrder: Vec<String>,
}
#[derive(SimpleObject)]
pub struct MapNodeEdit {
    id: ID,
    map: String,
    node: String,
    time: i64,
    r#type: String,
}
#[derive(SimpleObject)]
pub struct NodeChildLink {
    id: ID,
    creator: String,
    createdAt: i64,
    parent: String,
    child: String,
    group: String,
    orderKey: String,
    form: Option<String>,
    seriesAnchor: Option<bool>,
    seriesEnd: Option<bool>,
    polarity: Option<String>,
    c_parentType: Option<String>,
    c_childType: Option<String>,
}
#[derive(SimpleObject)]
pub struct MapNodePhrasing {
    id: ID,
    creator: String,
    createdAt: i64,
    node: String,
    r#type: String,
    text_base: String,
    text_negation: Option<String>,
    text_question: Option<String>,
    note: Option<String>,
    terms: Vec<serde_json::Value>,
    references: Vec<String>,
}
#[derive(SimpleObject)]
pub struct NodeRating {
    id: ID,
    accessPolicy: String,
    node: String,
    r#type: String,
    creator: String,
    createdAt: i64,
    value: f32,
}
#[derive(SimpleObject)]
pub struct MapNodeRevision {
    id: ID,
    node: String,
    creator: String,
    createdAt: i64,
    phrasing: serde_json::Value,
    phrasing_tsvector: String,
    note: Option<String>,
    displayDetails: Option<serde_json::Value>,
    equation: Option<serde_json::Value>,
    references: Option<serde_json::Value>,
    quote: Option<serde_json::Value>,
    media: Option<serde_json::Value>,
}
#[derive(SimpleObject)]
pub struct MapNodeTag {
    id: ID,
    creator: String,
    createdAt: i64,
    nodes: Vec<String>,
    labels: Option<serde_json::Value>,
    mirrorChildrenFromXToY: Option<serde_json::Value>,
    xIsExtendedByY: Option<serde_json::Value>,
    mutuallyExclusiveGroup: Option<serde_json::Value>,
    restrictMirroringOfX: Option<serde_json::Value>,
}
#[derive(SimpleObject)]
pub struct MapNode {
    id: ID,
    creator: String,
    createdAt: i64,
    r#type: String,
    rootNodeForMap: Option<String>,
    c_currentRevision: Option<String>,
    accessPolicy: String,
    multiPremiseArgument: Option<bool>,
    argumentType: Option<String>,
    extras: serde_json::Value,
}
#[derive(SimpleObject)]
pub struct Share {
    id: ID,
    creator: String,
    createdAt: i64,
    name: String,
    r#type: String,
    mapID: Option<String>,
    mapView: serde_json::Value,
}*/