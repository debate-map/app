import {Row} from "react-vcomponents";
import {GetNode_HK} from "./HKStore.js";
import {observer_mgl} from "mobx-graphlink";
import React from "react";

export const NodeUI_HK_ = observer_mgl(({nodeID}: {nodeID: string})=>{
	const node = GetNode_HK(nodeID);
	if (node == null) return <div>Loading...</div>;

	return (
		<Row style={{
			background: "rgba(0,0,0,.3)", borderRadius: 5, padding: "3px 7px",
			marginLeft: 1000, marginTop: 500,
		}}>
			{node.title["@value"]}
		</Row>
	);
});
