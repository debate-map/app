import {BaseComponent, GetDOM, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {Button, Column, Row, TextInput, Select, Text, Pre, Button_styles} from "web-vcore/nm/react-vcomponents.js";
import {GetErrorMessagesUnderElement, GetEntries, Clone, E, Range, DEL, CloneWithPrototypes, ModifyString} from "web-vcore/nm/js-vextensions.js";
import React, {Fragment, useState} from "react";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {SourceChain, Source, SourceType, GetSourceNamePlaceholderText, GetSourceAuthorPlaceholderText, Source_linkURLPattern, Attachment, AttachmentType, MediaAttachment, GetAttachmentType, AttachmentTarget} from "dm_common";
import {Validate} from "web-vcore/nm/mobx-graphlink.js";
import {Chroma, ES, Observer, VDateTime} from "web-vcore";
import Moment from "web-vcore/nm/moment";
import {DetailsUI_Base} from "UI/@Shared/DetailsUI_Base";
import {AttachmentEditorUI} from "UI/@Shared/Attachments/AttachmentEditorUI";
import {chroma_maxDarken} from "Utils/UI/General";
import {ButtonChain} from "Utils/ReactComponents/ButtonChain";

@Observer
export class AttachmentsEditorUI extends DetailsUI_Base<Attachment[], AttachmentsEditorUI, {target: AttachmentTarget, allowedAttachmentTypes: AttachmentType[]}> {
	render() {
		const {phase, target, allowedAttachmentTypes} = this.props;
		const {newData} = this.state;
		const {enabled, Change} = this.helpers;

		const [selectedAttachmentIndex, setSelectedAttachmentIndex] = useState(0);

		const selectedAttachment = newData[selectedAttachmentIndex] as Attachment|n;
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
							media: new MediaAttachment(),
						});
						newData.push(attachment);
						Change();
					}}/>}
				</Row>
				{selectedAttachment &&
					<AttachmentEditorUI phase={phase} baseData={selectedAttachment} onChange={val=>Change(newData[selectedAttachmentIndex] = val)}
					target={target} allowedAttachmentTypes={allowedAttachmentTypes}/>}
			</Column>
		);
	}
}