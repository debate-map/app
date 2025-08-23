import {Row} from "react-vcomponents";
import {E} from "js-vextensions";
import {GetChangeTypeOutlineColor, ChangeType} from "dm_common";
import React from "react";

type Props = {
	addedDescendants: number,
	editedDescendants: number,
	textOutline?: string
};

export const NodeChangesMarker = (props: Props)=>{
	const {addedDescendants, editedDescendants, textOutline = "rgba(10,10,10,1)"} = props;

	const changeTypesActive = [
		addedDescendants > 0 && ChangeType.add,
		editedDescendants > 0 && ChangeType.edit,
	].filter(a=>a);
	if (changeTypesActive.length == 0) return null;

	const changeMessageParts = [] as string[];
	if (addedDescendants > 0) changeMessageParts.push(`${addedDescendants} added`);
	if (editedDescendants > 0) changeMessageParts.push(`${editedDescendants} edited`);
	const changesMessage = `Node changes in this subtree: ${changeMessageParts.join(", ")}`;

	return (
		<Row title={changesMessage} style={E(
			{
				fontSize: 13, fontWeight: 500,
				// filter: "drop-shadow(0px 0px 5px rgba(0,0,0,1))"
				textShadow: `-1px 0 ${textOutline}, 0 1px ${textOutline}, 1px 0 ${textOutline}, 0 -1px ${textOutline}`,
				background: "rgba(0,0,0,.3)", padding: "1px 3px", borderRadius: 3, textAlign: "center",
			},
		)}>
			{/*changeTypesActive.length == 1 &&
			<>
				{addedDescendants > 0 &&
					<Row style={{color: `rgba(${GetChangeTypeOutlineColor(ChangeType.add)},.8)`}}>{addedDescendants} new</Row>}
				{editedDescendants > 0 &&
					<Row style={{color: `rgba(${GetChangeTypeOutlineColor(ChangeType.edit)},.8)`}}>{editedDescendants} edit</Row>}
				</>*/}

			<>
				{addedDescendants > 0 &&
					<Row style={{color: GetChangeTypeOutlineColor(ChangeType.add)?.alpha(.8).css()}}>+{addedDescendants}</Row>}
				{editedDescendants > 0 &&
					<Row ml={addedDescendants > 0 ? 4 : 0} style={{color: GetChangeTypeOutlineColor(ChangeType.edit)?.alpha(.8).css()}}>˄{editedDescendants}</Row>}
			</>
		</Row>
	);
};
