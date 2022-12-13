import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {LimitBarPos} from "UI/@Shared/Maps/Node/NodeUI.js";
import {E, emptyArray} from "web-vcore/nm/js-vextensions.js";
import React from "react";
import {Column} from "react-vcomponents";
import {GetTimeFromWhichToShowChangedNodes} from "Store/main/maps/mapStates/$mapState";
import {ChangeType, Map} from "dm_common";
import {GetPathsToChangedDescendantNodes_WithChangeTypes} from "Store/db_ext/mapNodeEdits";
import {Observer} from "web-vcore";
import {NodeChangesMarker} from "./NodeChangesMarker.js";

@Observer
export class NodeChildCountMarker extends BaseComponentPlus({textOutline: "rgba(10,10,10,1)"} as {map: Map, path: string, childCount: number, textOutline?: string}, {}) {
	render() {
		const {map, path, childCount, textOutline} = this.props;
		if (childCount == 0) return null;

		const sinceTime = GetTimeFromWhichToShowChangedNodes(map.id);
		const pathsToChangedDescendantNodes_withChangeTypes = GetPathsToChangedDescendantNodes_WithChangeTypes.CatchBail(emptyArray, map.id, sinceTime, path); // catch bail, to lazy-load path-changes
		const addedDescendants = pathsToChangedDescendantNodes_withChangeTypes.filter(a=>a == ChangeType.add).length;
		const editedDescendants = pathsToChangedDescendantNodes_withChangeTypes.filter(a=>a == ChangeType.edit).length;
		const showChangesMarker = addedDescendants > 0 || editedDescendants > 0;

		return (
			<Column style={{position: "absolute", left: `calc(100% + ${showChangesMarker ? 4 : 8}px)`, top: 0, bottom: 0, justifyContent: "center"}}>
				<div
					title={`Child count: ${childCount}`}
					style={E(
						{
							fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,.8)",
							// filter: "drop-shadow(0px 0px 5px rgba(0,0,0,1))"
							textShadow: `-1px 0 ${textOutline}, 0 1px ${textOutline}, 1px 0 ${textOutline}, 0 -1px ${textOutline}`,
						},
						//showBelowMessage && {paddingBottom: 13},
						showChangesMarker && {
							background: "rgba(0,0,0,.3)", padding: "1px 3px", borderRadius: 3, textAlign: "center" as const,
							marginBottom: 2,
						},
					)}
				>
					{childCount}
				</div>
				{showChangesMarker &&
					<NodeChangesMarker {...{addedDescendants, editedDescendants}}/>}
			</Column>
		);
	}
}