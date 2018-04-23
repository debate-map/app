import {BaseComponent} from "react-vextensions";
import {LimitBarPos} from "UI/@Shared/Maps/MapNode/NodeUI";
import {Column, Row} from "react-vcomponents";
import {GetChangeTypeOutlineColor, ChangeType} from "Store/firebase/mapNodeEditTimes";
import {ChildLimitBar} from "./NodeChildHolder";

export class NodeChangesMarker extends BaseComponent<{addedDescendants: number, editedDescendants: number, textOutline?: string, limitBarPos?: LimitBarPos}, {}> {
	static defaultProps = {textOutline: "rgba(10,10,10,1)"};
	render() {
		let {addedDescendants, editedDescendants, textOutline, limitBarPos} = this.props;
		return (
			<Column style={E(
				{
					margin: "auto 0 auto 9px", fontSize: 13, fontWeight: 500,
					//filter: "drop-shadow(0px 0px 5px rgba(0,0,0,1))"
					textShadow: `-1px 0 ${textOutline}, 0 1px ${textOutline}, 1px 0 ${textOutline}, 0 -1px ${textOutline}`,
				},
				limitBarPos == LimitBarPos.Above && {paddingTop: ChildLimitBar.HEIGHT},
				{paddingBottom: 0 + (limitBarPos == LimitBarPos.Below ? ChildLimitBar.HEIGHT : 0)},
			)}>
				{addedDescendants > 0 &&
					<Row style={{color: `rgba(${GetChangeTypeOutlineColor(ChangeType.Add)},.8)`}}>{addedDescendants} new</Row>}
				{editedDescendants > 0 &&
					<Row style={{color: `rgba(${GetChangeTypeOutlineColor(ChangeType.Edit)},.8)`}}>{editedDescendants} edited</Row>}
			</Column>
		);
	}
}