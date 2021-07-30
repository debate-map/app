import {Clone, GetEntries, GetErrorMessagesUnderElement, CloneWithPrototypes, E, WaitXThenRun, DelIfFalsy, ObjectCE} from "web-vcore/nm/js-vextensions.js";
import Moment from "web-vcore/nm/moment";
import {Column, Pre, RowLR, Select, TextArea, TextInput, Row, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentWithConnector, GetDOM, BaseComponentPlus, BaseComponent, RenderSource} from "web-vcore/nm/react-vextensions.js";
import {BoxController, ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
// import {IDAndCreationInfoUI} from "UI/@Shared/CommonPropUIs/IDAndCreationInfoUI.js";
import {MapNodePhrasing, MapNodePhrasingType, AddPhrasing, MapNodeRevision, MapNode, MapNodeType, GetAttachmentType, MapNodeL2, AttachmentType, MapNodePhrasing_Embedded, TermAttachment, MapNodeRevision_titlePattern, TitleKey, NodeChildLink, ClaimForm, MapNodeL3} from "dm_common";
import React from "react";
import {GenericEntryInfoUI} from "UI/@Shared/CommonPropUIs/GenericEntryInfoUI";
import {ES} from "web-vcore";
import {TermAttachmentsUI} from "./TermAttachmentsUI";

type Props = {
	baseData: MapNodePhrasing_Embedded & {id?: string},
	node: MapNodeL3, // node properties are used to constrain what phrasing options are available
	forNew: boolean, enabled?: boolean, style?, onChange?: (newData: MapNodePhrasing, error: string)=>void,
};
type State = {newData: MapNodePhrasing, dataError: string|n};
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
		const {baseData, node, forNew, enabled, style} = this.props;
		const {newData} = this.state;
		const attachmentType = GetAttachmentType(node);

		const Change = (..._)=>this.OnChange();

		const splitAt = 110;
		const sharedProps = E(OmitRef(this.props), this.state, {splitAt, Change});
		return (
			<Column style={style}>
				{!forNew && baseData.id != null &&
					<GenericEntryInfoUI id={baseData.id} creatorID={newData.creator} createdAt={newData.createdAt}/>}
				{forNew && node.link?.id != null &&
				<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
					<Pre>Type: </Pre>
					<Select options={GetEntries(MapNodePhrasingType)} enabled={false} style={ES({flex: 1})}
						value={newData.type} onChange={val=>Change(newData.type = val)}/>
				</RowLR>}
				<Title_Base {...sharedProps}/>
				{node.type == MapNodeType.claim &&
					<OtherTitles {...sharedProps}/>}
				<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
					<Pre>Note: </Pre>
					<TextArea enabled={enabled} autoSize={true} style={ES({flex: 1})}
						value={newData.note} onChange={val=>Change(newData.note = val)}/>
				</RowLR>
				{(attachmentType == AttachmentType.none || attachmentType == AttachmentType.references || attachmentType == AttachmentType.equation) &&
					<TermAttachmentsUI {...sharedProps}/>}
			</Column>
		);
	}
	GetValidationError() {
		return GetErrorMessagesUnderElement(GetDOM(this))[0];
	}

	GetNewData() {
		const {newData} = this.state;
		return CloneWithPrototypes(newData) as MapNodePhrasing;
	}
}

class Title_Base extends BaseComponent<PhrasingDetailsUI_SharedProps, {}> {
	render() {
		const {forNew, splitAt, node} = this.props;

		return (
			<>
				<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
					<Text>Title (base): </Text>
					<TitleInput {...OmitRef(this.props)} titleKey="text_base" innerRef={a=>a && forNew && this.lastRender_source == RenderSource.Mount && WaitXThenRun(0, ()=>a.DOM && a.DOM_HTML.focus())}/>
				</RowLR>
				{forNew && node.type == MapNodeType.argument &&
					<Row mt={5} style={{background: "rgba(255,255,255,.1)", padding: 5, borderRadius: 5}}>
						<Pre allowWrap={true}>{`
An argument title should be a short "key phrase" that gives the gist of the argument, for easy remembering/scanning.

Examples:
* Shadow during lunar eclipses
* May have used biased sources
* Quote: Socrates

The detailed version of the argument will be embodied in its premises/child-claims.
						`.trim()}
						</Pre>
					</Row>}
			</>
		);
	}
}

function WillNodeUseQuestionTitleHere(node: MapNodeL2, linkData: NodeChildLink|n) {
	return node.type == MapNodeType.claim && !node.current.quote && linkData && linkData.form == ClaimForm.question;
}

class OtherTitles extends BaseComponent<PhrasingDetailsUI_SharedProps, {}> {
	render() {
		const {forNew, node, splitAt, Change} = this.props;
		const willUseQuestionTitleHere = WillNodeUseQuestionTitleHere(node, node.link);
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
				{willUseQuestionTitleHere && forNew &&
					<Row mt={5} style={{background: "rgba(255,255,255,.1)", padding: 5, borderRadius: 5}}>
						<Pre allowWrap={true}>At this location (under a category node), the node will be displayed with the (yes or no) question title.</Pre>
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
			//const hasOtherTitles = newDataAsL2.type == MapNodeType.claim && newDataAsL2 == AttachmentType.none;
			const hasOtherTitlesEntered = newData.text_negation || newData.text_question;
			const willUseYesNoTitleHere = WillNodeUseQuestionTitleHere(node, node.link);
			extraProps = {
				required: !hasOtherTitlesEntered && !willUseYesNoTitleHere,
				ref: this.props.innerRef, // if supplied
			};
		}
		return (
			//<TextInput enabled={enabled} style={ES({flex: 1})} value={newRevisionData.titles["negation"]} onChange={val=>Change(newRevisionData.titles["negation"] = val)}/>
			<TextArea
				enabled={enabled} allowLineBreaks={false} style={ES({flex: 1})} pattern={MapNodeRevision_titlePattern} autoSize={true}
				value={newData[titleKey]} onChange={val=>{
					//let matches = val.Matches(/\{(.+?)\}(\[[0-9]+?\])?/);
					//let termNames = [];
					const cleanedVal = val ? val.replace(/\{(.+?)\}(\[[0-9]+?\])?/g, (m, g1, g2)=>{
						//termNames.push(g1);
						const termName = g1;
						if (newData.terms == null) {
							newData.terms = [];
						}
						if (!newData.terms.Any(a=>a.id == termName)) {
							newData.terms.push(new TermAttachment({id: termName}));
						}
						return g1;
					}) : null;
					newData.VSet(titleKey, DelIfFalsy(cleanedVal));
					Change();
				}}
				// for "base" title-key
				{...extraProps}
			/>
		);
	}
}

export function ShowAddPhrasingDialog(node: MapNodeL3, type: MapNodePhrasingType) {
	let newEntry = new MapNodePhrasing({
		node: node.id,
		type,
	});

	let valid = false;
	const boxController: BoxController = ShowMessageBox({
		title: "Add phrasing", cancelButton: true,
		message: ()=>{
			boxController.options.okButtonProps = {enabled: valid};
			return (
				<Column style={{padding: "10px 0", width: 800}}>
					<PhrasingDetailsUI
						baseData={newEntry}
						node={node}
						forNew={true}
						onChange={(val, error)=>{
							newEntry = val;
							valid = !error;
							boxController.UpdateUI();
						}}/>
				</Column>
			);
		},
		onOK: ()=>{
			new AddPhrasing({phrasing: newEntry}).RunOnServer();
		},
	});
}