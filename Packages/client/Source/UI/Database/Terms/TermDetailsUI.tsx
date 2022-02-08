import {AddTerm, AttachmentType, GetAccessPolicy, GetUserHidden, MeID, Term, TermType, Term_disambiguationFormat} from "dm_common";
import React from "react";
import {store} from "Store/index.js";
import {GenericEntryInfoUI} from "UI/@Shared/CommonPropUIs/GenericEntryInfoUI.js";
import {DetailsUI_Base} from "UI/@Shared/DetailsUI_Base.js";
import {ES, InfoButton, Observer, observer_simple} from "web-vcore";
import {DEL, E, GetEntries} from "web-vcore/nm/js-vextensions.js";
import {GetAsync} from "web-vcore/nm/mobx-graphlink";
import {observer} from "web-vcore/nm/mobx-react";
import {Button, Column, Pre, Row, RowLR, Select, Text, TextArea, TextInput} from "web-vcore/nm/react-vcomponents.js";
import {BoxController, ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {GetNiceNameForTermType} from "../../Database/TermsUI.js";
import {PolicyPicker} from "../Policies/PolicyPicker.js";
import {AttachmentsEditorUI} from "./AttachmentsEditorUI.js";

@Observer
export class TermDetailsUI extends DetailsUI_Base<Term, TermDetailsUI> {
	render() {
		const {phase, baseData, style, onChange} = this.props;
		const {newData} = this.state;
		const {Change, creating, enabled} = this.helpers;
		const accessPolicy = GetAccessPolicy(newData.accessPolicy);

		const splitAt = 140, width = 400;
		return (
			<Column style={style}>
				{!creating &&
					<GenericEntryInfoUI id={baseData.id} creatorID={newData.creator} createdAt={newData.createdAt}/>}
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Text>Name:</Text>
					<TextInput required
						//pattern={Term_nameFormat}
						enabled={enabled} style={{width: "100%"}}
						value={newData.name} onChange={val=>{
							const lastName = newData.name;
							newData.name = val;
							newData.forms = [newData.name.toLowerCase()].concat(newData.forms.Exclude(lastName, newData.name));
							Change();
						}}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
					<Row center>
						<Text>Forms:</Text>
						<InfoButton ml={5} text="Various forms of the term (as noun, adjective, etc). Used to add hover-based definition popups (for any forms found) to nodes that use this term as context."/>
					</Row>
					<Text>{newData.forms[0]}, </Text>
					<TextInput enabled={enabled} style={{width: "100%"}}
						value={newData.forms.slice(1).join(", ")} onChange={val=>{
							const otherForms = val.toLowerCase().split(",").map(a=>a.trim()).filter(a=>a.length);
							newData.forms = [newData.name.toLowerCase()].concat(otherForms.Exclude(newData.name));
							Change();
						}}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Row center>
						<Pre>Disambiguation:</Pre>
						<InfoButton ml={5} text={"This is only needed if the word has multiple meanings, and you want to specify which one you're defining."
							+ '\n\nExample: "element", "planet", and "mythology" would be suitable "disambiguation" texts for the different terms of "Mercury".'}/>
					</Row>
					<TextInput enabled={enabled} style={{width: "100%"}} pattern={Term_disambiguationFormat}
						value={newData.disambiguation} onChange={val=>Change(newData.VSet("disambiguation", val || DEL))}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Pre>Type: </Pre>
					<Select options={GetEntries(TermType, name=>GetNiceNameForTermType(TermType[name]))} enabled={enabled} style={ES({flex: 1})}
						value={newData.type} onChange={val=>Change(newData.type = val)}/>
				</RowLR>
				{/* newData.type == TermType.Action &&
					<RowLR mt={5} splitAt={splitAt} style={{width}}>
						<Pre>As gerund (noun): </Pre>
						<TextInput enabled={enabled} style={{width: "100%"}}
							value={newData.name_gerund} onChange={val=>Change(newData.name_gerund = val)}/>
					</RowLR> */}
				<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
					<Pre>Definition: </Pre>
					<TextArea autoSize={true} enabled={enabled} style={ES({flex: 1})} required
						value={newData.definition} onChange={val=>Change(newData.definition = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
					<Pre>Note: </Pre>
					<TextArea autoSize={true} enabled={enabled} style={ES({flex: 1})}
						value={newData.note} onChange={val=>Change(newData.note = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt}>
					<Pre>Access policy: </Pre>
					<PolicyPicker value={newData.accessPolicy} onChange={val=>Change(newData.accessPolicy = val)}>
						<Button enabled={enabled} text={accessPolicy ? `${accessPolicy.name} (id: ${accessPolicy.id})` : "(click to select policy)"} style={{width: "100%"}}/>
					</PolicyPicker>
				</RowLR>
				<AttachmentsEditorUI phase={phase} baseData={newData.attachments} onChange={val=>Change(newData.attachments = val)}
					target="term" allowedAttachmentTypes={[AttachmentType.media, AttachmentType.references]}/>
			</Column>
		);
	}
}

export async function ShowAddTermDialog(initialData?: Partial<Term>, postAdd?: (id: string)=>void) {
	const prep = await GetAsync(()=>{
		return {accessPolicy: GetUserHidden(MeID())?.lastAccessPolicy};
	});

	let newEntry = new Term(E({
		accessPolicy: prep.accessPolicy,
		name: "",
		forms: [""],
		type: TermType.commonNoun,
		definition: "",
	}, initialData));
	const getCommand = ()=>new AddTerm({term: newEntry});

	const boxController: BoxController = ShowMessageBox({
		title: "Add term", cancelButton: true,
		message: observer(()=>{
			const tempCommand = getCommand();
			boxController.options.okButtonProps = {
				enabled: tempCommand.Validate_Safe() == null,
				title: tempCommand.ValidateErrorStr,
			};

			return (
				<Column style={{padding: "10px 0", width: 600}}>
					<TermDetailsUI baseData={newEntry} phase="create"
						onChange={(val, error)=>{
							newEntry = val;
							boxController.UpdateUI();
						}}/>
				</Column>
			);
		}),
		onOK: async()=>{
			const {id} = await getCommand().RunOnServer();
			if (postAdd) postAdd(id);
		},
	});
}