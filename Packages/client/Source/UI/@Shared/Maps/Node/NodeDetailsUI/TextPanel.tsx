import {AsNodeL3, AttachmentType, GetAttachmentType_Node} from "dm_common";
import {PhrasingDetailsUI} from "UI/Database/Phrasings/PhrasingDetailsUI.js";
import {BaseComponent} from "react-vextensions";
import {NodeDetailsUI_SharedProps} from "../NodeDetailsUI.js";

export class TextPanel extends BaseComponent<NodeDetailsUI_SharedProps, {}> {
	render() {
		const {newData, newDataAsL2, newRevisionData, newLinkData, map, forNew, enabled, Change} = this.props;
		const attachmentType = GetAttachmentType_Node(newDataAsL2);

		//const sharedProps = this.props;
		return (
			<>
				<PhrasingDetailsUI baseData={newRevisionData.phrasing} node={AsNodeL3(newDataAsL2, newLinkData, null)} map={map} forNew={forNew} enabled={enabled}
					embeddedInNodeRevision={true}
					onChange={val=>{
						Change(newRevisionData.phrasing = val);
					}}/>
			</>
		);
	}
}