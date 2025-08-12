import {Attachment, AttachmentTarget, AttachmentType, GetAttachmentType, DescriptionAttachment, ReferencesAttachment} from "dm_common";
import React, {useState} from "react";
import {AttachmentEditorUI} from "UI/@Shared/Attachments/AttachmentEditorUI";
import {ButtonChain} from "Utils/ReactComponents/ButtonChain";
import {ES} from "web-vcore";
import {E, ModifyString} from "js-vextensions";
import {Button, Column, Row, Text} from "react-vcomponents";
import {ShowMessageBox} from "react-vmessagebox";
import {observer_mgl} from "mobx-graphlink";
import {DetailsUIBaseProps, useDetailsUI} from "UI/@Shared/DetailsUI_Base";

export type AttachmentsEditorUIProps = DetailsUIBaseProps<Attachment[], {target: AttachmentTarget, allowedAttachmentTypes: AttachmentType[]}>;

export const AttachmentsEditorUI = observer_mgl((props: AttachmentsEditorUIProps)=>{
	const {phase, baseData, target, allowedAttachmentTypes, onChange} = props;
	const {newData, helpers, containerRef} = useDetailsUI<Attachment[]>({
		baseData,
		phase,
		onChange,
	});
	const {enabled, Change} = helpers;

	const [selectedAttachmentIndex, setSelectedAttachmentIndex] = useState(0);
	const selectedAttachment = newData[selectedAttachmentIndex] as Attachment|n;

	// don't allow more than one equation/references attachment per node
	// (it is pointless/redundant, so just confuses people and processors if there are multiple)
	let allowedForSelected = allowedAttachmentTypes;
	if (selectedAttachment) {
		const otherAttachments = newData.filter((_, i)=>i !== selectedAttachmentIndex);
		if (otherAttachments.Any(a=>a.equation != null) && selectedAttachment.equation == null) {
			allowedForSelected = allowedForSelected.filter(a=>a != AttachmentType.equation);
		}
		if (otherAttachments.Any(a=>a.references != null) && selectedAttachment.references == null) {
			allowedForSelected = allowedForSelected.filter(a=>a != AttachmentType.references);
		}
	}

	return (
		<Column style={ES({flex: 1})} ref={containerRef as any}>
			<Row mb={5} style={{flexWrap: "wrap", gap: 5}}>
				<Text>Attachments:</Text>
				{newData.map((attachment, index)=>{
					const attachmentType = GetAttachmentType(attachment);
					const thisAttachmentSelected = selectedAttachmentIndex == index;
					const showDelete = enabled;
					return <ButtonChain key={index} selected={thisAttachmentSelected}>
						<Button text={`${index + 1}: ${ModifyString(attachmentType, m=>[m.startLower_to_upper])}`}
							style={E(
								{padding: "3px 7px"},
								showDelete && {borderRadius: "5px 0 0 5px"},
							)}
							onClick={()=>setSelectedAttachmentIndex(index)}/>
						{showDelete &&
						<Button text="X"
							style={E(
								{padding: "3px 5px", borderRadius: "0 5px 5px 0"},
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
					const attachment = allowedAttachmentTypes.includes(AttachmentType.description)
						// try to have new attachments start as type "description", since it's the simplest attachment type (so easier to try out)
						? new Attachment({description: new DescriptionAttachment()})
						: new Attachment({references: new ReferencesAttachment()});
					newData.push(attachment);
					Change();
				}}/>}
			</Row>
			{selectedAttachment &&
				<AttachmentEditorUI phase={phase} baseData={selectedAttachment} onChange={val=>Change(newData[selectedAttachmentIndex] = val)}
					target={target} allowedAttachmentTypes={allowedForSelected}
					setExpandedByDefault={val=>{
						if (val) {
							for (const [i, attachment] of newData.entries()) {
								newData[i] = {...attachment, expandedByDefault: false};
							}
							newData[selectedAttachmentIndex] = {...newData[selectedAttachmentIndex], expandedByDefault: true};
						} else {
							newData[selectedAttachmentIndex] = {...newData[selectedAttachmentIndex]};
							delete newData[selectedAttachmentIndex].expandedByDefault;
						}
						Change();
					}}/>
			}
		</Column>
	);
});
