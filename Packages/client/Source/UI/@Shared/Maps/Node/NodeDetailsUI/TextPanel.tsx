import {AsNodeL3, AttachmentType, GetAttachmentType_Node} from "dm_common";
import {PhrasingDetailsUI} from "UI/Database/Phrasings/PhrasingDetailsUI.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {NodeDetailsUI_SharedProps} from "../NodeDetailsUI.js";

export class TextPanel extends BaseComponent<NodeDetailsUI_SharedProps, {}> {
	render() {
		const {newData, newDataAsL2, newRevisionData, newLinkData, forNew, enabled, Change} = this.props;
		const attachmentType = GetAttachmentType_Node(newDataAsL2);

		//const sharedProps = this.props;
		return (
			<>
				<PhrasingDetailsUI baseData={newRevisionData.phrasing} node={AsNodeL3(newDataAsL2, newLinkData, null)} forNew={forNew} enabled={enabled}
					embeddedInNodeRevision={true}
					onChange={val=>{
						Change(newRevisionData.phrasing = val);
					}}/>
			</>
		);
	}
}