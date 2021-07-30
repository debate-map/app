import {AsNodeL3, AttachmentType, GetAttachmentType} from "dm_common";
import {PhrasingDetailsUI} from "UI/Database/Phrasings/PhrasingDetailsUI.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {NodeDetailsUI_SharedProps} from "../NodeDetailsUI.js";

export class TextPanel extends BaseComponent<NodeDetailsUI_SharedProps, {}> {
	render() {
		const {newData, newDataAsL2, newRevisionData, newLinkData, forNew, enabled, Change} = this.props;
		const attachmentType = GetAttachmentType(newDataAsL2);

		//const sharedProps = this.props;
		return (
			<>
				{(attachmentType == AttachmentType.none || attachmentType == AttachmentType.references) &&
				<PhrasingDetailsUI baseData={newRevisionData.phrasing} node={AsNodeL3(newDataAsL2, newLinkData, null)} forNew={forNew} enabled={enabled} onChange={val=>{
					Change(newRevisionData.phrasing = val);
				}}/>}
			</>
		);
	}
}