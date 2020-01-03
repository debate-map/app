import {GetEntries, WaitXThenRun} from "js-vextensions";
import {Div, Pre, Row, Select, TextArea, TextInput, Text, Button, DropDown, DropDownTrigger, DropDownContent, Column} from "react-vcomponents";
import {BaseComponent, RenderSource} from "react-vextensions";
import {AttachmentType, GetAttachmentType} from "Store/firebase/nodeRevisions/@AttachmentType";
import {GetFinalPolarity} from "Store/firebase/nodes/$node";
import {ChildEntry, ClaimForm, MapNodeL2} from "Store/firebase/nodes/@MapNode";
import {ArgumentType, GetArgumentTypeDisplayText, MapNodeRevision_titlePattern} from "Store/firebase/nodes/@MapNodeRevision";
import {MapNodeType} from "Store/firebase/nodes/@MapNodeType";
import {ES} from "Utils/UI/GlobalStyles";
import {TermAttachment} from "Store/firebase/nodeRevisions/@TermAttachment";
import {Observer, Validate} from "vwebapp-framework";
import {GetTerm, GetTermVariantNumber} from "Store/firebase/terms";
import {NodeDetailsUI_SharedProps} from "../NodeDetailsUI";
import {TermDefinitionPanel} from "../NodeUI/Panels/DefinitionsPanel";

export class TextPanel extends BaseComponent<NodeDetailsUI_SharedProps, {}> {
	render() {
		const {newData, newDataAsL2, newRevisionData, forNew, enabled, Change} = this.props;
		const attachmentType = GetAttachmentType(newDataAsL2);

		const sharedProps = this.props;
		return (
			<>
				{attachmentType == AttachmentType.None &&
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
				{attachmentType == AttachmentType.None &&
					<NodeTermsUI {...sharedProps}/>}
			</>
		);
	}
}

class Title_Base extends BaseComponent<NodeDetailsUI_SharedProps, {}> {
	render() {
		const {forNew, enabled, newData, newDataAsL2, newRevisionData, newLinkData, Change} = this.props;
		const claimType = GetAttachmentType(newDataAsL2);
		const hasOtherTitles = newData.type == MapNodeType.Claim && claimType == AttachmentType.None;
		const hasOtherTitlesEntered = newRevisionData.titles.negation || newRevisionData.titles.yesNoQuestion;
		const willUseYesNoTitleHere = WillNodeUseQuestionTitleHere(newDataAsL2, newLinkData);

		return (
			<div>
				<Row center>
					<Text>Title (base): </Text>
					{/* <TextInput enabled={enabled} style={ES({flex: 1})} required={!hasOtherTitlesEntered && !willUseYesNoTitleHere}
						ref={a=>a && forNew && this.lastRender_source == RenderSource.Mount && WaitXThenRun(0, ()=>a.DOM.focus())}
						value={newRevisionData.titles["base"]} onChange={val=>Change(newRevisionData.titles["base"] = val)}/> */}
					<TextArea enabled={enabled} required={!hasOtherTitlesEntered && !willUseYesNoTitleHere} pattern={MapNodeRevision_titlePattern} autoSize={true}
						allowLineBreaks={false} style={ES({flex: 1})}
						ref={a=>a && forNew && this.lastRender_source == RenderSource.Mount && WaitXThenRun(0, ()=>a.DOM && a.DOM_HTML.focus())}
						value={newRevisionData.titles["base"]} onChange={val=>Change(newRevisionData.titles["base"] = val)}/>
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
					{/* <TextInput enabled={enabled} style={ES({flex: 1})} value={newRevisionData.titles["negation"]} onChange={val=>Change(newRevisionData.titles["negation"] = val)}/> */}
					<TextArea enabled={enabled} allowLineBreaks={false} style={ES({flex: 1})} pattern={MapNodeRevision_titlePattern} autoSize={true}
						value={newRevisionData.titles["negation"]} onChange={val=>Change(newRevisionData.titles["negation"] = val)}/>
				</Row>
				<Row key={1} mt={5} style={{display: "flex", alignItems: "center"}}>
					<Pre>Title (question): </Pre>
					{/* <TextInput enabled={enabled} style={ES({flex: 1})} required={willUseQuestionTitleHere}
						value={newRevisionData.titles["yesNoQuestion"]} onChange={val=>Change(newRevisionData.titles["yesNoQuestion"] = val)}/> */}
					<TextArea enabled={enabled} allowLineBreaks={false} style={ES({flex: 1})} pattern={MapNodeRevision_titlePattern} autoSize={true}
						value={newRevisionData.titles["yesNoQuestion"]} onChange={val=>Change(newRevisionData.titles["yesNoQuestion"] = val)}/>
				</Row>
				{willUseQuestionTitleHere && forNew &&
					<Row mt={5} style={{background: "rgba(255,255,255,.1)", padding: 5, borderRadius: 5}}>
						<Pre allowWrap={true}>At this location (under a category node), the node will be displayed with the (yes or no) question title.</Pre>
					</Row>}
			</Div>
		);
	}
}

class ArgumentInfo extends BaseComponent<NodeDetailsUI_SharedProps, {}> {
	render() {
		const {enabled, baseRevisionData, parent, newData, newDataAsL2, newRevisionData, newLinkData, Change} = this.props;

		const polarity = GetFinalPolarity(newLinkData.polarity, newLinkData.form);

		return (
			<Row>
				<Pre>Type: If </Pre>
				<Select options={GetEntries(ArgumentType, name=>GetArgumentTypeDisplayText(ArgumentType[name]))}
					enabled={enabled} value={newRevisionData.argumentType} onChange={val=>{
						Change(newRevisionData.argumentType = val);
					}}/>
				<Pre> premises below are true, they impact the parent.</Pre>
			</Row>
		);
	}
}

@Observer
class NodeTermsUI extends BaseComponent<NodeDetailsUI_SharedProps, {}> {
	render() {
		const {enabled, baseRevisionData, parent, newData, newDataAsL2, newRevisionData, newLinkData, Change} = this.props;
		const terms = (newRevisionData.termAttachments || []).map(a=>(Validate("UUID", a.id) == null ? GetTerm(a.id) : null));

		return (
			<>
				<Row mt={5}>
					<Text style={{fontWeight: "bold"}}>Terms:</Text>
					<Button ml={5} p="3px 7px" text="+" onClick={()=>{
						if (newRevisionData.termAttachments == null) newRevisionData.termAttachments = [];
						newRevisionData.termAttachments.push(new TermAttachment({id: ""}));
						Change();
					}}/>
				</Row>
				{(newRevisionData.termAttachments || []).map((termAttachment, index)=>{
					const term = terms[index];
					return (
						<Row key={index}>
							<TextInput placeholder="Enter term ID or name" style={{flex: 50}} value={termAttachment.id} onChange={val=>Change(termAttachment.id = val)}/>
							<Row ml={5} style={{position: "relative", flex: 50}}>
								<DropDown style={{flex: 1}}>
									<DropDownTrigger>
										<Button style={{flex: 1, display: "flex"}}
											text={term
												? `Term: ${term.name}${term.disambiguation ? ` (${term.disambiguation})` : ""}`
												: `(click to search/create)`}/>
									</DropDownTrigger>
									<DropDownContent style={{left: 0, zIndex: 1, borderRadius: "0 0 5px 5px"}}><Column>
										{term && <TermDefinitionPanel term={term} termVariantNumber={GetTermVariantNumber(term)} showID={false}/>}
										{!term &&
										<Column>
											TODO
										</Column>}
									</Column></DropDownContent>
								</DropDown>
							</Row>
						</Row>
					);
				})}
			</>
		);
	}
}