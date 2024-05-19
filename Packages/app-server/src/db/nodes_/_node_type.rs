use std::collections::HashMap;

use rust_shared::once_cell::sync::Lazy;
use rust_shared::itertools::Itertools;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::async_graphql;
use rust_shared::async_graphql::{Enum};
use rust_shared::utils::general::average;
use serde::{Serialize, Deserialize};

use crate::db::node_links::ChildGroup;

wrap_slow_macros!{

#[derive(Enum, Copy, Clone, Eq, PartialEq, Serialize, Deserialize, Hash, Debug)]
pub enum NodeType {
    #[graphql(name = "category")] category,
    #[graphql(name = "package")] package,
    #[graphql(name = "multiChoiceQuestion")] multiChoiceQuestion,
    #[graphql(name = "claim")] claim,
    #[graphql(name = "argument")] argument,
}

}

static FREEFORM_TYPES: Lazy<Vec<NodeType>> = Lazy::new(|| vec![NodeType::category, NodeType::package, NodeType::multiChoiceQuestion, NodeType::claim, NodeType::argument]);

//#[derive(Clone)]
pub struct NodeType_Info {
	pub childGroup_childTypes: HashMap<ChildGroup, Vec<NodeType>>,
}
// sync:js
pub static BASE_NODE_TYPE_INFO: Lazy<HashMap<NodeType, NodeType_Info>> = Lazy::new(|| {
    HashMap::from([
        (NodeType::category, NodeType_Info {
            childGroup_childTypes: HashMap::from([
                (ChildGroup::generic, vec![NodeType::category, NodeType::package, NodeType::multiChoiceQuestion, NodeType::claim]),
				(ChildGroup::freeform, FREEFORM_TYPES.clone()),
            ]),
        }),
        (NodeType::package, NodeType_Info {
            childGroup_childTypes: HashMap::from([
                (ChildGroup::generic, vec![NodeType::claim]),
				(ChildGroup::freeform, FREEFORM_TYPES.clone()),
            ]),
        }),
        (NodeType::multiChoiceQuestion, NodeType_Info {
            childGroup_childTypes: HashMap::from([
                (ChildGroup::generic, vec![NodeType::claim]),
				(ChildGroup::freeform, FREEFORM_TYPES.clone()),
            ]),
        }),
        (NodeType::claim, NodeType_Info {
            childGroup_childTypes: HashMap::from([
                (ChildGroup::truth, vec![NodeType::argument, NodeType::claim]), // note: if child is "claim", link should have polarity (filling role of single-premise argument, but with no relevance-args possible; used in SL maps)
				(ChildGroup::freeform, FREEFORM_TYPES.clone()),
            ]),
        }),
        (NodeType::argument, NodeType_Info {
            childGroup_childTypes: HashMap::from([
                (ChildGroup::generic, vec![NodeType::claim]),
                (ChildGroup::relevance, vec![NodeType::argument]),
				(ChildGroup::freeform, FREEFORM_TYPES.clone()),
            ]),
        }),
    ])
});

pub fn get_node_type_info(node_type: NodeType) -> &'static NodeType_Info {
	//return BASE_NODE_TYPE_INFO[&node_type].clone();
	return &BASE_NODE_TYPE_INFO[&node_type];
}