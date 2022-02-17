import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {LimitBarPos} from "UI/@Shared/Maps/MapNode/NodeUI.js";
import {Column, Row} from "web-vcore/nm/react-vcomponents.js";
import {E} from "web-vcore/nm/js-vextensions.js";
import {GetChangeTypeOutlineColor, ChangeType} from "dm_common";

export class NodeChangesMarker extends BaseComponent<{addedDescendants: number, editedDescendants: number, textOutline?: string}, {}> {
	static defaultProps = {textOutline: "rgba(10,10,10,1)"};
	render() {
		const {addedDescendants, editedDescendants, textOutline} = this.props;
		return (
			<Column style={E(
				{
					margin: "auto 0 auto 9px", fontSize: 13, fontWeight: 500,
					// filter: "drop-shadow(0px 0px 5px rgba(0,0,0,1))"
					textShadow: `-1px 0 ${textOutline}, 0 1px ${textOutline}, 1px 0 ${textOutline}, 0 -1px ${textOutline}`,
				},
			)}>
				{addedDescendants > 0 &&
					<Row style={{color: `rgba(${GetChangeTypeOutlineColor(ChangeType.add)},.8)`}}>{addedDescendants} new</Row>}
				{editedDescendants > 0 &&
					<Row style={{color: `rgba(${GetChangeTypeOutlineColor(ChangeType.edit)},.8)`}}>{editedDescendants} edited</Row>}
			</Column>
		);
	}
}