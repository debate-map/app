import {ArgumentType, AttachmentType, GetArgumentTypeDisplayText, GetAttachmentType, MapNodeType} from "dm_common";
import {PhrasingDetailsUI} from "UI/Database/Phrasings/PhrasingDetailsUI.js";
import {GetEntries} from "web-vcore/nm/js-vextensions.js";
import {Pre, Row, Select} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {NodeDetailsUI_SharedProps} from "../NodeDetailsUI.js";

export class TextPanel extends BaseComponent<NodeDetailsUI_SharedProps, {}> {
	render() {
		const {newData, newDataAsL2, newRevisionData, forNew, enabled, Change} = this.props;
		const attachmentType = GetAttachmentType(newDataAsL2);

		const sharedProps = this.props;
		return (
			<>
				{(attachmentType == AttachmentType.none || attachmentType == AttachmentType.references) &&
				<>
					<PhrasingDetailsUI baseData={newRevisionData.phrasing} node={newDataAsL2} forNew={forNew} enabled={enabled} onChange={val=>{
						Change(newRevisionData.phrasing = val);
					}}/>
					{newData.type == MapNodeType.argument &&
						<ArgumentInfo {...sharedProps}/>}
				</>}
			</>
		);
	}
}

class ArgumentInfo extends BaseComponent<NodeDetailsUI_SharedProps, {}> {
	render() {
		const {enabled, baseRevisionData, parent, newData, newDataAsL2, newRevisionData, newLinkData, Change} = this.props;

		//const polarity = GetDisplayPolarity(A.NonNull_(newLinkData.polarity), A.NonNull_(newLinkData.form));

		return (
			<Row mt={5}>
				<Pre>Type: If </Pre>
				<Select options={GetEntries(ArgumentType, name=>GetArgumentTypeDisplayText(ArgumentType[name]))}
					enabled={enabled} value={newData.argumentType} onChange={val=>{
						Change(newData.argumentType = val);
					}}/>
				<Pre> premises are true, they impact the parent.</Pre>
			</Row>
		);
	}
}