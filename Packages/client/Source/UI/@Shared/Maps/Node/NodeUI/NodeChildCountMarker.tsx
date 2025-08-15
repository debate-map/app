import {E, emptyArray} from "js-vextensions";
import React from "react";
import {Column} from "react-vcomponents";
import {GetTimeFromWhichToShowChangedNodes} from "Store/main/maps/mapStates/$mapState";
import {ChangeType, DMap} from "dm_common";
import {GetPathsToChangedDescendantNodes_WithChangeTypes} from "Store/db_ext/mapNodeEdits";
import {SLMode} from "UI/@SL/SL.js";
import {NodeChangesMarker} from "./NodeChangesMarker.js";
import {observer_mgl} from "mobx-graphlink";

export type NodeChildCountMarker_Props = {
	map: DMap,
	path: string,
	childCount: number,
	childrenLoading: boolean,
	textOutline?: string
};

export const NodeChildCountMarker = observer_mgl((props: NodeChildCountMarker_Props)=>{
	const {map, path, childCount, childrenLoading, textOutline} = props;
	if (childCount == 0 && !childrenLoading) return null;

	const sinceTime = GetTimeFromWhichToShowChangedNodes(map.id);
	const pathsToChangedDescendantNodes_withChangeTypes = GetPathsToChangedDescendantNodes_WithChangeTypes.CatchBail(emptyArray, map.id, sinceTime, path); // catch bail, to lazy-load path-changes
	const addedDescendants = pathsToChangedDescendantNodes_withChangeTypes.filter(a=>a == ChangeType.add).length;
	const editedDescendants = pathsToChangedDescendantNodes_withChangeTypes.filter(a=>a == ChangeType.edit).length;
	const showChangesMarker = addedDescendants > 0 || editedDescendants > 0;

	let leftGap = showChangesMarker ? 4 : 8;
	if (SLMode) leftGap = showChangesMarker ? 4 : 5; // use slightly smaller gap in sl-mode, since font-size is larger

	return (
		<Column style={{position: "absolute", left: `calc(100% + ${leftGap}px)`, top: 0, bottom: 0, justifyContent: "center"}}>
			<div
				title={`Child count: ${childCount}`}
				style={E(
					{
						fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,.8)",
						textShadow: `-1px 0 ${textOutline}, 0 1px ${textOutline}, 1px 0 ${textOutline}, 0 -1px ${textOutline}`,
					},
					SLMode && {
						fontSize: 16,
						fontWeight: 700,
						color: "#1C4C6C",
						textShadow: null,
					},
					showChangesMarker && {
						background: "rgba(0,0,0,.3)", padding: "1px 3px", borderRadius: 3, textAlign: "center" as const,
						marginBottom: 2,
					},
				)}
			>
				{childrenLoading ? "..." : `${SLMode ? "+" : ""}${childCount}`}
			</div>
			{showChangesMarker && <NodeChangesMarker {...{addedDescendants, editedDescendants}}/>}
		</Column>
	);

});
