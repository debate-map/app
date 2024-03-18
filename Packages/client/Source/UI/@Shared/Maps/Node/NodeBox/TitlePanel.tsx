import {Assert, Clone, E, WaitXThenRun} from "web-vcore/nm/js-vextensions.js";
import keycode from "keycode";
import _ from "lodash";
import {runInAction} from "web-vcore/nm/mobx.js";
import {Button, Pre, Row, Text, TextArea} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, FilterOutUnrecognizedProps, WarnOfTransientObjectProps} from "web-vcore/nm/react-vextensions.js";
import {store} from "Store";
import {GetNodeView, GetNodeViewsAlongPath} from "Store/main/maps/mapViews/$mapView.js";
import {AddNodeRevision, GetParentNode, GetFontSizeForNode, GetNodeDisplayText, GetNodeForm, missingTitleStrings, GetEquationStepNumber, ClaimForm, NodeRevision_titlePattern, NodeType, GetTermsAttached, Term, MeID, Map, IsUserCreatorOrMod, NodeRevision, TitleKey, GetExpandedByDefaultAttachment, AsNodeRevisionInput, Attachment, GetTitleIntegratedAttachment, GetParentNodeL3, Polarity, NodeL3, GetNodeRawTitleAndSuch} from "dm_common";
import {ES, InfoButton, IsDoubleClick, Observer, ParseTextForPatternMatchSegments, RunInAction, VReactMarkdown_Remarkable, HTMLProps_Fixed, HSLA, EB_ShowError, EB_StoreError, DefaultLoadingUI} from "web-vcore";
import React from "react";
import {BailError, BailInfo, GetAsync} from "web-vcore/nm/mobx-graphlink";
import {SLMode, ShowHeader} from "UI/@SL/SL.js";
import {SLSkin} from "Utils/Styles/Skins/SLSkin.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {RunCommand_AddNodeRevision} from "Utils/DB/Command.js";
import {DraggableProvidedDragHandleProps} from "web-vcore/nm/hello-pangea-dnd.js";
import {NodeMathUI} from "../NodeMathUI.js";
import {NodeBox} from "../NodeBox.js";
import {TermPlaceholder} from "./TermPlaceholder.js";

/* type TitlePanelProps = {parent: NodeBox, map: Map, node: NodeL2, nodeView: NodeView, path: string, indexInNodeList: number, style};
const TitlePanel_connector = (state, { node, path }: TitlePanelProps) => ({
	displayText: GetNodeDisplayText(node, path),
	$1: node.current.image && GetMedia(node.current.image.id),
	equationNumber: node.current.equation ? GetEquationStepNumber(path) : null,
});
@Connect(TitlePanel_connector)
// export class TitlePanel extends BaseComponentWithConnector(TitlePanel_connector, { editing: false, newTitle: null as string, applyingEdit: false }) { */

/* export type TitlePanelInternals = {OnDoubleClick};
export function TitlePanel(props: VProps<TitlePanelInternals, {
	parent: NodeBox, map: Map, node: NodeL2, nodeView: NodeView, path: string, indexInNodeList: number, style,
}>) { */

export function GetSegmentsForTerms(text: string, termsToSearchFor: Term[]) {
	// let segments = ParseSegmentsFromNodeDisplayText(text);
	/*const segments = ParseSegmentsForPatterns(text, [
		{name: "term", regex: /{(.+?)\}\[(.+?)\]/},
	]);*/
	/*const patterns = termsToSearchFor.SelectMany(term=>{
		return term.forms.map(form=>{
			return {name: `termForm`, termID: term.id, regex: new RegExp(`(^|\\W)(${_.escapeRegExp(form)})(\\W|$)`)};
		});
	});
	return ParseSegmentsForPatterns(text, patterns);*/

	//const termForm_termIDs = termsToSearchFor.SelectMany(term=>term.forms.map(a=>term.id));
	let patterns = [] as {name: string, regex: RegExp}[];
	if (termsToSearchFor.length) {
		const termForm_strings = termsToSearchFor.SelectMany(term=>{
			const formsForTerm = term.forms.map(form=>_.escapeRegExp(form));
			return formsForTerm;
		}).OrderByDescending(a=>a.length); // prefer matching long-forms over short-forms // doesn't seem to work atm; perhaps the regex always matches shorter options in (X|X|X) first
		const regex = new RegExp(`(^|\\W)(${termForm_strings.join("|")})(\\W|$)`, "i");
		//const patterns = [{name: "termForm", termForm_termIDs, regex}];
		patterns = [{name: "termForm", regex}];
	}
	return ParseTextForPatternMatchSegments(text, patterns);
}

@WarnOfTransientObjectProps
@Observer
export class TitlePanel extends BaseComponentPlus(
	{} as {
		parent: NodeBox, map: Map|n, node: NodeL3, path: string, indexInNodeList: number, style,
		dragHandleProps: DraggableProvidedDragHandleProps|n,
	} & HTMLProps_Fixed<"div">,
	{editing: false, edit_newTitle: null as string|n, edit_titleKey: null as TitleKey|n, applyingEdit: false},
) {
	OnDoubleClick = async()=>{
		const {node, path, map} = this.props;
		// ignore double-clicks on arguments (their text is determined automatically, so setting a custom value for the text field is just confusing)
		if (node.type == NodeType.argument) return;

		/* const creatorOrMod = IsUserCreatorOrMod(MeID(), node);
		if (creatorOrMod && node.current.equation == null) { */
		//if (CanEditNode(MeID(), node.id) && node.current.equation == null) {
		const titleAttachment = GetTitleIntegratedAttachment(node.current);
		const {titleInfo} = await GetAsync(()=>{
			return {
				//displayText: GetNodeDisplayText(node, path, map),
				titleInfo: GetNodeRawTitleAndSuch(node, path),
			};
		});
		if (IsUserCreatorOrMod(MeID(), node) && titleAttachment?.equation == null) {
			this.SetState({editing: true, edit_newTitle: titleInfo.rawTitle, edit_titleKey: titleInfo.usedField});
		}
	};

	OnTermHover = (termIDs: string[], hovered: boolean)=>{
		const {parent} = this.props;
		parent.SetState({hoverPanel: hovered ? "definitions" : null, hoverTermIDs: hovered ? termIDs : null});
	};
	OnTermClick = (termIDs: string[])=>{
		const {map, path} = this.props;
		// parent.SetState({hoverPanel: "definitions", hoverTermID: termID});
		RunInAction("TitlePanel_OnTermClick", ()=>{
			let nodeView_final = GetNodeView(map?.id, path);
			if (nodeView_final == null) {
				nodeView_final = GetNodeViewsAlongPath(map?.id, path, true).Last();
			}
			nodeView_final.openPanel = "definitions";
			nodeView_final.openTermIDs = termIDs;
		});
	};

	loadingUI(bailInfo: BailInfo) {
		return (
			<DefaultLoadingUI comp={bailInfo.comp} bailMessage={bailInfo.bailMessage}
				// TitlePanel *must* render an element with the drag-handle-props to avoid dnd-lib complaining, so if bail-error is present atm (ie. data loading), render those props onto an empty div
				extraUI_inRoot={<div {...this.props.dragHandleProps}/>}/>
		);
	}
	render() {
		// const { map, parent, node, nodeView, path, displayText, equationNumber, style, ...rest } = this.props;
		const {map, parent, node, path, style, onClick, dragHandleProps, ...rest} = this.props;
		const {editing, edit_newTitle, applyingEdit} = this.state;
		// UseImperativeHandle(ref, () => ({ OnDoubleClick }));
		/*const parentNode = GetParentNodeL3(path);
		const isPremiseOfSPA = IsPremiseOfSinglePremiseArgument(node, parentNode);
		const argNode = isPremiseOfSPA ? parentNode : node.type == NodeType.argument ? node : null;
		const isMultiPremiseArg = IsMultiPremiseArgument(node);*/

		const nodeView = GetNodeView(map?.id, path);
		const titleAttachment = GetTitleIntegratedAttachment(node.current);
		const latex = titleAttachment?.equation?.latex;
		//const isSubnode = IsNodeSubnode(node);

		const displayText = GetNodeDisplayText(node, path, map);

		const equationNumber = titleAttachment?.equation ? GetEquationStepNumber(path) : null;
		const noteText = (titleAttachment?.equation && titleAttachment?.equation.explanation) || node.current.phrasing.note;
		//const termsToSearchFor = GetTermsAttached(GetCurrentRevision(node.id, path, map?.id).id).filter(a=>a);
		const termsToSearchFor = GetTermsAttached(node.current.id).filter(a=>a) as Term[];

		return (
			// <Row style={{position: "relative"}}>
			<Row {...FilterOutUnrecognizedProps(rest, "div")}
				{...dragHandleProps}
				style={E(
					{
						position: "relative", cursor: "pointer", fontSize: GetFontSizeForNode(node, path),
						marginTop: !latex && GetSegmentsForTerms(displayText, termsToSearchFor).length > 1 ? -2 : 0, // if has terms in text, bump up a bit (to offset bump-down from <sup> elements)
						color: liveSkin.NodeTextColor(),
					},
					node.type == NodeType.argument && {
						color: liveSkin.NodeTextColor().alpha(SLMode ? 1 : .5).toString(), // for arguments, make text more transparent, since text is repetitive and can be distracting
						flex: 1, // maybe temp; since width is locked apparently, have title-panel fill gap (so toolbar-button goes all the way to right)
					},
					style,
					//GADDemo && {fontFamily: SLSkin.main.MainFont() /*fontSize: 15, letterSpacing: 1*/},
				)}
				onClick={e=>{
					if (IsDoubleClick(e)) this.OnDoubleClick();
					if (onClick) return onClick(e);
				}}
			>
				{equationNumber != null &&
					<Pre>{equationNumber}) </Pre>}
				{!editing &&
					<span style={ES(
						{flex: 1, position: "relative", whiteSpace: "initial"},
						node.type == NodeType.argument && {
							//whiteSpace: "pre", // for arguments, never wrap text // commented, since conflicts with sl arg-with-custom-text case; what case was this line needed for earlier?
							alignSelf: "center",
							//marginTop: -1, // "center" is actually below the center, so bump it up a bit
						},
						//isSubnode && {margin: "4px 0 1px 0"},
						titleAttachment == null && missingTitleStrings.Contains(displayText) && {color: "rgba(255,255,255,.3)"},
					)}>
						{titleAttachment?.equation && latex && <NodeMathUI text={titleAttachment.equation.text}
							onTermHover={(id, hovered)=>this.OnTermHover([id], hovered)}
							onTermClick={id=>this.OnTermClick([id])}
							termsToSearchFor={termsToSearchFor}/>}
						{!latex && RenderNodeDisplayText(displayText, termsToSearchFor, this)}
						{noteText &&
							<span style={{
								fontSize: 11, color: liveSkin.NodeTextColor().alpha(liveSkin.NodeTextColor().alpha() * .7).toString(),
								// marginLeft: "auto",
								marginLeft: 15,
								marginTop: GetSegmentsForTerms(noteText, termsToSearchFor).length > 1 ? -1 : 3, float: "right", // if has terms in note, bump up a bit (to offset bump-down from <sup> elements)
							}}>
								{/*noteText*/}
								{RenderNodeDisplayText(noteText, termsToSearchFor, this)}
							</span>}
					</span>}
				{editing &&
					<Row style={E(
						{flex: 1, position: "relative", whiteSpace: "initial", alignItems: "stretch"},
						//isSubnode && {margin: "4px 0 1px 0"},
					)}>
						{!applyingEdit &&
							<TextArea required={true} pattern={NodeRevision_titlePattern} allowLineBreaks={false} autoSize={true} style={E({flex: 1, minWidth: 0})}
								instant // must be instant-apply, since rb-dnd blocks button-triggered on-blur
								ref={a=>a && a.DOM_HTML.focus()}
								onKeyDown={e=>{
									if (e.keyCode == keycode.codes.esc) {
										this.SetState({editing: false, edit_newTitle: null});
									} else if (e.keyCode == keycode.codes.enter) {
										this.ApplyEdit();
									}
								}}
								value={edit_newTitle!} onChange={val=>this.SetState({edit_newTitle: val})}/>}
						{!applyingEdit &&
							<Button enabled={edit_newTitle!.match(NodeRevision_titlePattern) != null} text="✔️" p="0 3px" style={{borderRadius: "0 5px 5px 0"}}
								onClick={()=>this.ApplyEdit()}/>}
						{applyingEdit && <Row>Applying edit...</Row>}
					</Row>}
				{/*node.type == NodeType.claim && titleAttachment?.quote &&
					<InfoButton ml={5} text="Allowed modifications: bold, and collapsed segments [...]"/>*/}
			</Row>
		);
	}

	async ApplyEdit() {
		const {map, node, path, edit_newTitle, edit_titleKey} = this.PropsStateStash;
		if (edit_newTitle == null) return; // wait till loaded, within render() [yes, this could benefit from a cleanup]

		this.SetState({applyingEdit: true});

		//const parentNode = GetParentNode(path);

		//const form = GetNodeForm(node, path);
		//const titleKey: TitleKey = {[ClaimForm.negation]: "text_negation", [ClaimForm.question]: "text_question"}[form] || "text_base";
		const newRevision = (Clone(node.current) as NodeRevision).OmitUndefined(true);
		if (newRevision.phrasing[edit_titleKey!] != edit_newTitle) {
			newRevision.phrasing[edit_titleKey!] = edit_newTitle;

			/*const command = new AddNodeRevision({mapID: map?.id, revision: newRevision});
			const revisionID = await command.RunOnServer();*/
			const {id: revisionID} = await RunCommand_AddNodeRevision({mapID: map?.id, revision: AsNodeRevisionInput(newRevision)});
			RunInAction("TitlePanel.ApplyEdit", ()=>store.main.maps.nodeLastAcknowledgementTimes.set(node.id, Date.now()));
			//await WaitTillPathDataIsReceiving(DBPath(`nodeRevisions/${revisionID}`));
			//await WaitTillPathDataIsReceived(DBPath(`nodeRevisions/${revisionID}`));
			//await command.WaitTillDBUpdatesReceived();
		}
		if (this.mounted) {
			this.SetState({editing: false, edit_newTitle: null, applyingEdit: false});
		}
	}
}

export function RenderNodeDisplayText(text: string, termsToSearchFor: Term[], titlePanel: TitlePanel|n) {
	const segments = GetSegmentsForTerms(text, termsToSearchFor);
	//titlePanel.Stash({segments}); // for debugging

	const elements = [] as (string|JSX.Element)[];
	for (const [index, segment] of segments.entries()) {
		const mainPatternMatched = [...segment.patternMatches.keys()][0];
		const mainPattern_match = [...segment.patternMatches.values()][0];
		if (segment.patternMatches.size == 0) {
			const segmentText = segment.text;
			const edgeWhiteSpaceMatch = segmentText.match(/^( *).*?( *)$/);
			if (edgeWhiteSpaceMatch) {
				if (edgeWhiteSpaceMatch[1]) elements.push(<span key={elements.length}>{edgeWhiteSpaceMatch[1]}</span>);
				elements.push(
					<VReactMarkdown_Remarkable key={elements.length} containerType="span" source={segmentText}
						rendererOptions={{
							components: {
								p: props=><span>{props.children}</span>,
							},
						}}/>,
				);
				if (edgeWhiteSpaceMatch[2]) elements.push(<span key={elements.length}>{edgeWhiteSpaceMatch[2]}</span>);
			}
		} else if (mainPatternMatched.name == "termForm") {
			/*const refText = segment.textParts[1];
			const termID = segment.textParts[2];*/
			//const termStr = segment.textParts[2];
			const termStr = mainPattern_match[2];

			const terms = termsToSearchFor.filter(a=>a.forms.map(form=>form.toLowerCase()).includes(termStr.toLowerCase()))!; // nn: segments were initially found based on termsToSearchFor array
			const termIDs = terms.map(a=>a.id);
			elements.push(
				mainPattern_match[1],
				<TermPlaceholder key={elements.length} refText={termStr} termIDs={terms.map(a=>a.id)}
					useBasicTooltip={titlePanel == null}
					onHover={hovered=>titlePanel?.OnTermHover(termIDs, hovered)}
					onClick={()=>titlePanel?.OnTermClick(termIDs)}/>,
				mainPattern_match[3],
			);
		} else {
			Assert(false);
		}
	}
	return elements;
}