import {AsNodeL3} from "dm_common";
import {PhrasingDetailsUI} from "UI/Database/Phrasings/PhrasingDetailsUI.js";
import {NodeDetailsUI_SharedProps} from "../NodeDetailsUI.js";
import React from "react";

export const TextPanel = (props: NodeDetailsUI_SharedProps)=>{
	const {newDataAsL2, newRevisionData, newLinkData, map, forNew, enabled, Change} = props;

	return (
		<>
			<PhrasingDetailsUI baseData={newRevisionData.phrasing} node={AsNodeL3(newDataAsL2, newLinkData, null)} map={map} forNew={forNew} enabled={enabled}
				embeddedInNodeRevision={true}
				onChange={val=>{
					Change(newRevisionData.phrasing = val);
				}}/>
		</>
	);
};
