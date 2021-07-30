import {Assert, Clone, E, WaitXThenRun} from "web-vcore/nm/js-vextensions.js";
import keycode from "keycode";
import _ from "lodash";
import {runInAction} from "web-vcore/nm/mobx.js";
import {Button, Pre, Row, TextArea, TextInput} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, FilterOutUnrecognizedProps, WarnOfTransientObjectProps} from "web-vcore/nm/react-vextensions.js";
import {store} from "Store";
import {GetNodeView, GetNodeViewsAlongPath} from "Store/main/maps/mapViews/$mapView.js";
import {AddNodeRevision, GetParentNode, GetFontSizeForNode, GetNodeDisplayText, GetNodeForm, missingTitleStrings, GetEquationStepNumber, ClaimForm, MapNodeL2, MapNodeRevision_titlePattern, MapNodeType, GetTermsAttached, Term, MeID, Map, IsUserCreatorOrMod, MapNodeRevision, TitleKey} from "dm_common";
import {ES, InfoButton, IsDoubleClick, Observer, ParseSegmentsForPatterns, RunInAction, VReactMarkdown_Remarkable} from "web-vcore";
import React from "react";
import {GetCurrentRevision} from "Store/db_ext/nodes";
import {BailInfo, GetAsync} from "web-vcore/nm/mobx-graphlink";
import {NodeMathUI} from "../NodeMathUI.js";
import {NodeUI_Inner} from "../NodeUI_Inner.js";
import {TermPlaceholder} from "./TermPlaceholder.js";

/* type TitlePanelProps = {parent: NodeUI_Inner, map: Map, node: MapNodeL2, nodeView: MapNodeView, path: string, indexInNodeList: number, style};
const TitlePanel_connector = (state, { node, path }: TitlePanelProps) => ({
	displayText: GetNodeDisplayText(node, path),
	$1: node.current.image && GetMedia(node.current.image.id),
	equationNumber: node.current.equation ? GetEquationStepNumber(path) : null,
});
@Connect(TitlePanel_connector)
// export class TitlePanel extends BaseComponentWithConnector(TitlePanel_connector, { editing: false, newTitle: null as string, applyingEdit: false }) { */

/* export type TitlePanelInternals = {OnDoubleClick};
export function TitlePanel(props: VProps<TitlePanelInternals, {
	parent: NodeUI_Inner, map: Map, node: MapNodeL2, nodeView: MapNodeView, path: string, indexInNodeList: number, style,
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
			return formsForTerm.OrderByDescending(a=>a.length); // prefer matching long-forms over short-forms
		});
		const regex = new RegExp(`(^|\\W)(${termForm_strings.join("|")})(\\W|$)`, "i");
		//const patterns = [{name: "termForm", termForm_termIDs, regex}];
		patterns = [{name: "termForm", regex}];
	}
	return ParseSegmentsForPatterns(text, patterns);
}

@WarnOfTransientObjectProps
@Observer
export class TitlePanel extends BaseComponentPlus(
	{} as {parent: NodeUI_Inner, map: Map|n, node: MapNodeL2, path: string, indexInNodeList: number, style},
	{editing: false, edit_newTitle: null as string|n, applyingEdit: false},
) {
	OnDoubleClick = async()=>{
		const {node, path} = this.props;
		/* const creatorOrMod = IsUserCreatorOrMod(MeID(), node);
		if (creatorOrMod && node.current.equation == null) { */
		//if (CanEditNode(MeID(), node.id) && node.current.equation == null) {
		const displayText = await GetAsync(()=>GetNodeDisplayText(node, path));
		if (IsUserCreatorOrMod(MeID(), node) && node.current.equation == null) {
			this.SetState({editing: true, edit_newTitle: displayText});
		}
	};

	OnTermHover = (termID: string, hovered: boolean)=>{
		const {parent} = this.props;
		parent.SetState({hoverPanel: hovered ? "definitions" : null, hoverTermID: hovered ? termID : null});
	};
	OnTermClick = (termID: string)=>{
		const {map, path} = this.props;
		// parent.SetState({hoverPanel: "definitions", hoverTermID: termID});
		RunInAction("TitlePanel_OnTermClick", ()=>{
			let nodeView_final = GetNodeView(map?.id, path);
			if (nodeView_final == null) {
				nodeView_final = GetNodeViewsAlongPath(map?.id, path, true).Last();
			}
			nodeView_final.openPanel = "definitions";
			nodeView_final.openTermID = termID;
		});
	};

	render() {
		// const { map, parent, node, nodeView, path, displayText, equationNumber, style, ...rest } = this.props;
		const {map, parent, node, path, style, ...rest} = this.props;
		const {editing, edit_newTitle, applyingEdit} = this.state;
		// UseImperativeHandle(ref, () => ({ OnDoubleClick }));

		const nodeView = GetNodeView(map?.id, path);
		const latex = node.current.equation?.latex;
		//const isSubnode = IsNodeSubnode(node);

		const displayText = GetNodeDisplayText(node, path);

		const equationNumber = node.current.equation ? GetEquationStepNumber(path) : null;
		const noteText = (node.current.equation && node.current.equation.explanation) || node.current.note;
		const termsToSearchFor = GetTermsAttached(GetCurrentRevision(node.id, path, map?.id).id).filter(a=>a);

		const RenderNodeDisplayText = (text: string)=>{
			const segments = GetSegmentsForTerms(text, termsToSearchFor);
			this.Stash({segments}); // for debugging

			const elements = [] as (string|JSX.Element)[];
			for (const [index, segment] of segments.entries()) {
				if (segment.patternMatched == null) {
					const segmentText = segment.textParts[0];
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
				} else if (segment.patternMatched.name == "termForm") {
					/*const refText = segment.textParts[1];
					const termID = segment.textParts[2];*/
					const termStr = segment.textParts[2];
					//const termID = segment.patternMatched["termID"] as string;
					const term = termsToSearchFor.find(a=>a.forms.map(form=>form.toLowerCase()).includes(termStr.toLowerCase()))!; // nn: segments were initially found based on termsToSearchFor array
					elements.push(
						segment.textParts[1],
						<TermPlaceholder key={elements.length} refText={termStr} termID={term.id}
							onHover={hovered=>this.OnTermHover(term.id, hovered)} onClick={()=>this.OnTermClick(term.id)}/>,
						segment.textParts[3],
					);
				} else {
					Assert(false);
				}
			}
			return elements;
		};

		return (
			// <Row style={{position: "relative"}}>
			<div {...FilterOutUnrecognizedProps(rest, "div")}
				style={E(
					{
						position: "relative", cursor: "pointer", fontSize: GetFontSizeForNode(node/*, isSubnode*/),
						marginTop: !latex && GetSegmentsForTerms(displayText, termsToSearchFor).length > 1 ? -2 : 0, // if has terms in text, bump up a bit (to offset bump-down from <sup> elements)
					},
					style,
				)}
				onClick={e=>void IsDoubleClick(e) && this.OnDoubleClick()}
			>
				{equationNumber != null &&
					<Pre>{equationNumber}) </Pre>}
				{!editing &&
					<span style={ES(
						{position: "relative", whiteSpace: "initial"},
						//isSubnode && {margin: "4px 0 1px 0"},
						missingTitleStrings.Contains(displayText) && {color: "rgba(255,255,255,.3)"},
					)}>
						{latex && <NodeMathUI text={node.current.equation!.text} onTermHover={this.OnTermHover} onTermClick={this.OnTermClick} termsToSearchFor={termsToSearchFor}/>}
						{!latex && RenderNodeDisplayText(displayText)}
					</span>}
				{editing &&
					<Row style={E(
						{position: "relative", whiteSpace: "initial", alignItems: "stretch"},
						//isSubnode && {margin: "4px 0 1px 0"},
					)}>
						{!applyingEdit &&
							<TextArea required={true} pattern={MapNodeRevision_titlePattern} allowLineBreaks={false} autoSize={true} style={ES({flex: 1})}
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
							<Button enabled={edit_newTitle!.match(MapNodeRevision_titlePattern) != null} text="✔️" p="0 3px" style={{borderRadius: "0 5px 5px 0"}}
								onClick={()=>this.ApplyEdit()}/>}
						{applyingEdit && <Row>Applying edit...</Row>}
					</Row>}
				{noteText &&
					<Pre style={{
						fontSize: 11, color: "rgba(255,255,255,.5)",
						// marginLeft: "auto",
						marginLeft: 15,
						marginTop: GetSegmentsForTerms(noteText, termsToSearchFor).length > 1 ? -1 : 3, float: "right", // if has terms in note, bump up a bit (to offset bump-down from <sup> elements)
					}}>
						{/*noteText*/}
						{RenderNodeDisplayText(noteText)}
					</Pre>}
				{node.type == MapNodeType.claim && node.current.quote &&
					<InfoButton ml={5} text="Allowed modifications: bold, [...] (collapsed segments)"/>}
			</div>
		);
	}

	async ApplyEdit() {
		const {map, node, path, edit_newTitle} = this.PropsStateStash;
		if (edit_newTitle == null) return; // wait till loaded, within render() [yes, this could benefit from a cleanup]

		this.SetState({applyingEdit: true});

		//const parentNode = GetParentNode(path);

		const form = GetNodeForm(node, path);
		const titleKey: TitleKey = {[ClaimForm.negation]: "text_negation", [ClaimForm.question]: "text_question"}[form] || "text_base";
		const newRevision = (Clone(node.current) as MapNodeRevision).ExcludeKeys("phrasing_tsvector").OmitUndefined(true);
		if (newRevision.phrasing[titleKey] != edit_newTitle) {
			newRevision.phrasing[titleKey] = edit_newTitle;

			const command = new AddNodeRevision({mapID: map?.id, revision: newRevision});
			const revisionID = await command.RunOnServer();
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