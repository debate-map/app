import {E, GetEntries, WaitXThenRun, DelIfFalsy} from "js-vextensions";
import {Button, Column, Div, DropDown, DropDownContent, DropDownTrigger, Pre, Row, Select, Text, TextArea, TextInput} from "react-vcomponents";
import {BaseComponent, BaseComponentPlus, RenderSource} from "react-vextensions";
import {ShowAddTermDialog} from "Source/UI/Database/Terms/TermDetailsUI";
import {ES} from "Source/Utils/UI/GlobalStyles";
import {TermDefinitionPanel} from "../NodeUI/Panels/DefinitionsPanel";
import {NodeTermsUI} from "./TextPanel/NodeTermsUI";
import {NodeDetailsUI_SharedProps} from "../NodeDetailsUI";
import {GetAttachmentType, AttachmentType} from "@debate-map/server-link/Source/Link";
import {MapNodeType} from "@debate-map/server-link/Source/Link";
import {MapNodeL2, ChildEntry, ClaimForm} from "@debate-map/server-link/Source/Link";
import {MapNodeRevision_titlePattern, ArgumentType, GetArgumentTypeDisplayText} from "@debate-map/server-link/Source/Link";
import {TermAttachment} from "@debate-map/server-link/Source/Link";
import {GetDisplayPolarity} from "@debate-map/server-link/Source/Link";

export class TextPanel extends BaseComponent<NodeDetailsUI_SharedProps, {}> {
	render() {
		const {newData, newDataAsL2, newRevisionData, forNew, enabled, Change} = this.props;
		const attachmentType = GetAttachmentType(newDataAsL2);

		const sharedProps = this.props;
		return (
			<>
				{(attachmentType == AttachmentType.None || attachmentType == AttachmentType.References) &&
				<>
					<Title_Base {...sharedProps}/>
					{newData.type == MapNodeType.Claim &&
						<OtherTitles {...sharedProps}/>}
					{newData.type == MapNodeType.Argument &&
						<ArgumentInfo {...sharedProps}/>}
				</>}
				<Row mt={5}>
					<Text>Note: </Text>
					<TextInput enabled={enabled} style={{width: "100%"}}
						value={newRevisionData.note} onChange={val=>Change(newRevisionData.note = val)}/>
				</Row>
				{(attachmentType == AttachmentType.None || attachmentType == AttachmentType.References || attachmentType == AttachmentType.Equation) &&
					<NodeTermsUI {...sharedProps}/>}
			</>
		);
	}
}

class Title_Base extends BaseComponent<NodeDetailsUI_SharedProps, {}> {
	render() {
		const {forNew, enabled, newData, newDataAsL2, newRevisionData, newLinkData, Change} = this.props;
		const claimType = GetAttachmentType(newDataAsL2);

		return (
			<div>
				<Row center>
					<Text>Title (base): </Text>
					<TitleInput {...this.props} titleKey="base" innerRef={a=>a && forNew && this.lastRender_source == RenderSource.Mount && WaitXThenRun(0, ()=>a.DOM && a.DOM_HTML.focus())}/>
				</Row>
				{forNew && newData.type == MapNodeType.Argument &&
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
			</div>
		);
	}
}

function WillNodeUseQuestionTitleHere(node: MapNodeL2, linkData: ChildEntry) {
	return node.type == MapNodeType.Claim && !node.current.quote && linkData && linkData.form == ClaimForm.YesNoQuestion;
}

class OtherTitles extends BaseComponent<NodeDetailsUI_SharedProps, {}> {
	render() {
		const {newDataAsL2, newRevisionData, forNew, enabled, newLinkData, Change} = this.props;
		const willUseQuestionTitleHere = WillNodeUseQuestionTitleHere(newDataAsL2, newLinkData);
		return (
			<Div>
				<Row key={0} mt={5} style={{display: "flex", alignItems: "center"}}>
					<Pre>Title (negation): </Pre>
					<TitleInput {...this.props} titleKey="negation"/>
				</Row>
				<Row key={1} mt={5} style={{display: "flex", alignItems: "center"}}>
					<Pre>Title (question): </Pre>
					{/* <TextInput enabled={enabled} style={ES({flex: 1})} required={willUseQuestionTitleHere}
						value={newRevisionData.titles["yesNoQuestion"]} onChange={val=>Change(newRevisionData.titles["yesNoQuestion"] = val)}/> */}
					<TitleInput {...this.props} titleKey="yesNoQuestion"/>
				</Row>
				{willUseQuestionTitleHere && forNew &&
					<Row mt={5} style={{background: "rgba(255,255,255,.1)", padding: 5, borderRadius: 5}}>
						<Pre allowWrap={true}>At this location (under a category node), the node will be displayed with the (yes or no) question title.</Pre>
					</Row>}
			</Div>
		);
	}
}

class TitleInput extends BaseComponentPlus({} as {titleKey: string, innerRef?: any} & NodeDetailsUI_SharedProps & React.Props<TextArea>, {}) {
	render() {
		let {titleKey, newDataAsL2, newRevisionData, forNew, enabled, newLinkData, Change} = this.props;
		let extraProps = {};
		if (titleKey == "base") {
			//const hasOtherTitles = newDataAsL2.type == MapNodeType.Claim && newDataAsL2 == AttachmentType.None;
			const hasOtherTitlesEntered = newRevisionData.titles.negation || newRevisionData.titles.yesNoQuestion;
			const willUseYesNoTitleHere = WillNodeUseQuestionTitleHere(newDataAsL2, newLinkData);
			extraProps = {
				required: !hasOtherTitlesEntered && !willUseYesNoTitleHere,
				ref: this.props.innerRef, // if supplied
			};
		}
		return (
			//<TextInput enabled={enabled} style={ES({flex: 1})} value={newRevisionData.titles["negation"]} onChange={val=>Change(newRevisionData.titles["negation"] = val)}/>
			<TextArea
				enabled={enabled} allowLineBreaks={false} style={ES({flex: 1})} pattern={MapNodeRevision_titlePattern} autoSize={true}
				value={newRevisionData.titles[titleKey]} onChange={val=> {
					//let matches = val.Matches(/\{(.+?)\}(\[[0-9]+?\])?/);
					//let termNames = [];
					let cleanedVal = val ? val.replace(/\{(.+?)\}(\[[0-9]+?\])?/g, (m, g1, g2)=> {
						//termNames.push(g1);
						let termName = g1;
						if (newRevisionData.termAttachments == null) {
							newRevisionData.termAttachments = [];
						}
						if (!newRevisionData.termAttachments.Any(a=>a.id == termName)) {
							newRevisionData.termAttachments.push(new TermAttachment({id: termName}));
						}
						return g1;
					}) : null;
					newRevisionData.titles.VSet(titleKey, DelIfFalsy(cleanedVal));
					Change();
				}}
				// for "base" title-key
				{...extraProps}
			/>
		);
	}
}

class ArgumentInfo extends BaseComponent<NodeDetailsUI_SharedProps, {}> {
	render() {
		const {enabled, baseRevisionData, parent, newData, newDataAsL2, newRevisionData, newLinkData, Change} = this.props;

		const polarity = GetDisplayPolarity(newLinkData.polarity, newLinkData.form);

		return (
			<Row mt={5}>
				<Pre>Type: If </Pre>
				<Select options={GetEntries(ArgumentType, name=>GetArgumentTypeDisplayText(ArgumentType[name]))}
					enabled={enabled} value={newRevisionData.argumentType} onChange={val=>{
						Change(newRevisionData.argumentType = val);
					}}/>
				<Pre> premises are true, they impact the parent.</Pre>
			</Row>
		);
	}
}