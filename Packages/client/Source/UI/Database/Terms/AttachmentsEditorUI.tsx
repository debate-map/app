import {Attachment, AttachmentTarget, AttachmentType, GetAttachmentType, MediaAttachment, DescriptionAttachment} from "dm_common";
import React, {useState} from "react";
import {AttachmentEditorUI} from "UI/@Shared/Attachments/AttachmentEditorUI";
import {DetailsUI_Base} from "UI/@Shared/DetailsUI_Base";
import {ButtonChain} from "Utils/ReactComponents/ButtonChain";
import {ES, Observer} from "web-vcore";
import {E, ModifyString} from "web-vcore/nm/js-vextensions.js";
import {Button, Column, Row, Text} from "web-vcore/nm/react-vcomponents.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";

@Observer
export class AttachmentsEditorUI extends DetailsUI_Base<Attachment[], AttachmentsEditorUI, {target: AttachmentTarget, allowedAttachmentTypes: AttachmentType[]}> {
	render() {
		const {phase, target, allowedAttachmentTypes} = this.props;
		const {newData} = this.state;
		const {enabled, Change} = this.helpers;
		const [selectedAttachmentIndex, setSelectedAttachmentIndex] = useState(0);
		const selectedAttachment = newData[selectedAttachmentIndex] as Attachment|n;

		// don't allow more than one equation/references attachment per node (it is pointless/redundant, so just confuses people and processors if there are multiple)
		let allowedAttachmentTypes_forSelected = allowedAttachmentTypes;
		if (selectedAttachment) {
			const otherAttachments = newData.Exclude(selectedAttachment);
			if (otherAttachments.Any(a=>a.equation != null) && selectedAttachment.equation == null) {
				allowedAttachmentTypes_forSelected = allowedAttachmentTypes_forSelected.filter(a=>a != AttachmentType.equation);
			}
			if (otherAttachments.Any(a=>a.references != null) && selectedAttachment.references == null) {
				allowedAttachmentTypes_forSelected = allowedAttachmentTypes_forSelected.filter(a=>a != AttachmentType.references);
			}
		}

		return (
			<Column style={ES({flex: 1})}>
				<Row mb={5} style={{flexWrap: "wrap", gap: 5}}>
					<Text>Attachments:</Text>
					{/*<Select ml={5} displayType="button bar" options={Range(0, newData.length - 1).map(index=>`#${index + 1}`)} value={selectedSourceChainIndex} onChange={val=>this.SetState({selectedSourceChainIndex: val})}/>*/}
					{newData.map((attachment, index)=>{
						const attachmentType = GetAttachmentType(attachment);
						const thisAttachmentSelected = selectedAttachmentIndex == index;
						const showDelete = enabled;
						return <ButtonChain key={index} selected={thisAttachmentSelected}>
							<Button text={`${index + 1}: ${ModifyString(attachmentType, m=>[m.startLower_to_upper])}`}
								style={E(
									{padding: "3px 7px"},
									showDelete && {borderRadius: "5px 0 0 5px"},
									//thisAttachmentSelected && {backgroundColor: Button_background_dark},
									//ButtonChain_Button_CSSOverrides(thisAttachmentSelected),
								)}
								onClick={()=>setSelectedAttachmentIndex(index)}/>
							{showDelete &&
							<Button text="X"
								style={E(
									{padding: "3px 5px", borderRadius: "0 5px 5px 0"},
									//ButtonChain_Button_CSSOverrides(thisAttachmentSelected),
								)}
								onClick={()=>{
									ShowMessageBox({
										title: `Remove attachment #${index + 1}`, cancelButton: true,
										message: `Remove attachment #${index + 1}`,
										onOK: ()=>{
											// if last chain, and we're also selected, update selection to be valid, then proceed with deletion
											if (index == newData.length - 1 && thisAttachmentSelected) {
												setSelectedAttachmentIndex(index - 1);
												// do we need to add waiting a bit here first, like for SetState version?
												Change(newData.RemoveAt(index));
											} else {
												Change(newData.RemoveAt(index));
											}
										},
									});
								}}/>}
						</ButtonChain>;
					})}
					{enabled && <Button text="+" onClick={()=>{
						const attachment = new Attachment({
							// have new attachments start as type "description", since it's the simplest attachment type (so easier to try out)
							description: new DescriptionAttachment(),
						});
						newData.push(attachment);
						Change();
					}}/>}
				</Row>
				{selectedAttachment &&
					<AttachmentEditorUI phase={phase} baseData={selectedAttachment} onChange={val=>Change(newData[selectedAttachmentIndex] = val)}
						target={target} allowedAttachmentTypes={allowedAttachmentTypes_forSelected}/>}
			</Column>
		);
	}
}