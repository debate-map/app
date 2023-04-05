import {Clone, GetEntries, GetErrorMessagesUnderElement, CloneWithPrototypes, E, WaitXThenRun, DelIfFalsy, ObjectCE} from "web-vcore/nm/js-vextensions.js";
import Moment from "web-vcore/nm/moment";
import {Column, Pre, RowLR, Select, TextArea, TextInput, Row, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentWithConnector, GetDOM, BaseComponentPlus, BaseComponent, RenderSource} from "web-vcore/nm/react-vextensions.js";
import {BoxController, ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
// import {IDAndCreationInfoUI} from "UI/@Shared/CommonPropUIs/IDAndCreationInfoUI.js";
import {NodePhrasing, NodePhrasingType, AddPhrasing, NodeRevision, NodeL1, NodeType, GetAttachmentType_Node, NodeL2, AttachmentType, NodePhrasing_Embedded, TermAttachment, NodeRevision_titlePattern, TitleKey, NodeLink, ClaimForm, NodeL3, GetExpandedByDefaultAttachment} from "dm_common";
import React from "react";
import {GenericEntryInfoUI} from "UI/@Shared/CommonPropUIs/GenericEntryInfoUI";
import {ES, Observer} from "web-vcore";
import {GADDemo_Main} from "UI/@GAD/GAD";
import {CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {RunCommand_AddNodePhrasing} from "Utils/DB/Command";
import {TermAttachmentsUI} from "./TermAttachmentsUI";
import {PhrasingReferencesUI} from "./PhrasingReferencesUI";

type Props = {
	baseData: NodePhrasing_Embedded & {id?: string},
	node: NodeL3, // node properties are used to constrain what phrasing options are available
	forNew: boolean, enabled?: boolean, style?, onChange?: (newData: NodePhrasing, error: string)=>void,
	embeddedInNodeRevision?: boolean,
};
type State = {newData: NodePhrasing, dataError: string|n};
export type PhrasingDetailsUI_SharedProps = Props & State & {splitAt: number, Change};

function OmitRef<T>(props: T): T {
	return ObjectCE(props).ExcludeKeys("ref" as any) as T;
}

export class PhrasingDetailsUI extends BaseComponentPlus({enabled: true} as Props, {} as State) {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) { // if base-data changed
			this.SetState({newData: CloneWithPrototypes(props.baseData)});
		}
	}
	OnChange() {
		const {onChange} = this.props;
		const newData = this.GetNewData();
		const error = this.GetValidationError();
		if (onChange) onChange(newData, error);
		this.SetState({newData, dataError: error});
	}

	render() {
		const {baseData, node, forNew, enabled, style, embeddedInNodeRevision} = this.props;
		const {newData} = this.state;
		const attachmentType = GetAttachmentType_Node(node);

		const Change = (..._)=>this.OnChange();

		let noteField_label = "Note";
		if (GADDemo_Main) {
			noteField_label = "Description";
			/*noteField_label = embeddedInNodeRevision
				? "Description" // main-phrasing uses the note-field for a "description" (since it can use references-attachment for references)
				: "Reference"; // alt-phrasings uses the note-field to include a "reference"*/
		}

		const splitAt = 110;
		const sharedProps = E(OmitRef(this.props), this.state, {splitAt, Change});
		return (
			<Column style={style}>
				{!forNew && baseData.id != null &&
					<GenericEntryInfoUI id={baseData.id} creatorID={newData.creator} createdAt={newData.createdAt}/>}
				{forNew && node.link?.id != null &&
				<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
					<Pre>Type: </Pre>
					<Select options={GetEntries(NodePhrasingType)} enabled={false} style={ES({flex: 1})}
						value={newData.type} onChange={val=>Change(newData.type = val)}/>
				</RowLR>}
				<Title_Base {...sharedProps}/>
				{node.type == NodeType.claim &&
					<OtherTitles {...sharedProps}/>}
				<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
					<Pre>{noteField_label}: </Pre>
					<TextArea enabled={enabled} autoSize={true} style={ES({flex: 1})}
						value={newData.note} onChange={val=>Change(newData.note = val)}/>
				</RowLR>
				<TermAttachmentsUI {...sharedProps}/>
				{newData.type == NodePhrasingType.web &&
					<PhrasingReferencesUI {...sharedProps}/>}
			</Column>
		);
	}
	GetValidationError() {
		return GetErrorMessagesUnderElement(GetDOM(this))[0];
	}

	GetNewData() {
		const {newData} = this.state;
		return CloneWithPrototypes(newData) as NodePhrasing;
	}
}

class Title_Base extends BaseComponent<PhrasingDetailsUI_SharedProps, {}> {
	render() {
		const {forNew, splitAt, node} = this.props;
		const attachmentType = GetAttachmentType_Node(node);

		return (
			<>
				{node.type == NodeType.claim && (attachmentType == AttachmentType.quote || attachmentType == AttachmentType.media) &&
					<Row mt={5} style={{background: "rgba(255,255,255,.1)", padding: 5, borderRadius: 5}}>
						<Pre allowWrap={true}>If no title override is specified, a generic source-assertion claim title will be shown.</Pre>
					</Row>}
				<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
					<Text>Title (base): </Text>
					<TitleInput {...OmitRef(this.props)} titleKey="text_base" innerRef={a=>a && forNew && this.lastRender_source == RenderSource.Mount && WaitXThenRun(0, ()=>a.DOM && a.DOM_HTML.focus())}/>
				</RowLR>
				{forNew && node.type == NodeType.argument &&
					<Row mt={5} style={{background: "rgba(255,255,255,.1)", padding: 5, borderRadius: 5}}>
						<Pre allowWrap={true}>{`
							An argument title should be a short "key phrase" that gives the gist of the argument, for easy remembering/scanning.

							Examples:
							* Shadow during lunar eclipses
							* May have used biased sources
							* Quote: Socrates

							The detailed version of the argument will be embodied in its premises/child-claims.
						`.AsMultiline(0)}
						</Pre>
					</Row>}
			</>
		);
	}
}

const WillNodePreferQuestionTitleHere = CreateAccessor((node: NodeL2, linkData: NodeLink|n)=>{
	const mainAttachment = GetExpandedByDefaultAttachment(node.current);
	return Boolean(node.type == NodeType.claim && mainAttachment?.quote == null && linkData && linkData.form == ClaimForm.question);
});

class OtherTitles extends BaseComponent<PhrasingDetailsUI_SharedProps, {}> {
	render() {
		const {forNew, node, splitAt, Change} = this.props;
		const willPreferQuestionTitleHere = WillNodePreferQuestionTitleHere(node, node.link);
		return (
			<>
				<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
					<Pre>Title (negation): </Pre>
					<TitleInput {...OmitRef(this.props)} titleKey="text_negation"/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
					<Pre>Title (question): </Pre>
					{/* <TextInput enabled={enabled} style={ES({flex: 1})} required={willUseQuestionTitleHere}
						value={newRevisionData.titles["question"]} onChange={val=>Change(newRevisionData.titles["question"] = val)}/> */}
					<TitleInput {...OmitRef(this.props)} titleKey="text_question"/>
				</RowLR>
				{willPreferQuestionTitleHere && forNew &&
					<Row mt={5} style={{background: "rgba(255,255,255,.1)", padding: 5, borderRadius: 5}}>
						<Pre allowWrap={true}>At this location (under a category node), this node will be displayed with its (yes or no) question title, if specified.</Pre>
					</Row>}
			</>
		);
	}
}

class TitleInput extends BaseComponentPlus({} as {titleKey: TitleKey, innerRef?: any} & PhrasingDetailsUI_SharedProps & React.Props<TextArea>, {}) {
	render() {
		const {titleKey, newData, node, enabled, Change} = this.props;
		let extraProps = {};
		if (titleKey == "text_base") {
			//const hasOtherTitles = newDataAsL2.type == NodeType.claim && newDataAsL2 == AttachmentType.none;
			const hasOtherTitlesEntered = newData.text_negation || newData.text_question;
			const willPreferYesNoTitleHere = WillNodePreferQuestionTitleHere(node, node.link);
			extraProps = {
				required: !hasOtherTitlesEntered && !willPreferYesNoTitleHere,
				ref: this.props.innerRef, // if supplied
			};
		}
		return (
			//<TextInput enabled={enabled} style={ES({flex: 1})} value={newRevisionData.titles["negation"]} onChange={val=>Change(newRevisionData.titles["negation"] = val)}/>
			<TextArea
				enabled={enabled} allowLineBreaks={false} style={ES({flex: 1})} pattern={NodeRevision_titlePattern} autoSize={true}
				value={newData[titleKey]} onChange={val=>{
					// find any term-markers, adding entries for them then removing the markers (eg. "some {term} name" -> "some term name")
					const cleanedVal = val ? val.replace(/\{(.+?)\}(\[[0-9]+?\])?/g, (m, g1, g2)=>{
						const termName = g1;
						if (newData.terms == null) {
							newData.terms = [];
						}
						if (!newData.terms.Any(a=>a.id == termName)) {
							newData.terms.push(new TermAttachment({id: termName}));
						}
						return g1;
					}) : null;

					//newData.VSet(titleKey, DelIfFalsy(cleanedVal));
					// if a field is editable by the UI, the result should always be non-null (empty string is preferred over null)
					newData[titleKey] = cleanedVal || "";

					Change();
				}}
				// for "base" title-key
				{...extraProps}
			/>
		);
	}
}

export function ShowAddPhrasingDialog(node: NodeL3, type: NodePhrasingType) {
	let newEntry = new NodePhrasing({
		node: node.id,
		type,
	});

	let valid = false;
	const boxController: BoxController = ShowMessageBox({
		title: "Add phrasing", cancelButton: true,
		message: ()=>{
			return (
				<Column style={{padding: "10px 0", width: 800}}>
					<PhrasingDetailsUI
						baseData={newEntry}
						node={node}
						forNew={true}
						onChange={(val, error)=>{
							newEntry = val;
							valid = !error;

							boxController.options.okButtonProps = {enabled: valid};
							boxController.UpdateUI();
						}}/>
				</Column>
			);
		},
		onOK: ()=>{
			//new AddPhrasing({phrasing: newEntry}).RunOnServer();
			RunCommand_AddNodePhrasing(newEntry);
		},
	});
}