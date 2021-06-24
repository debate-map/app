import {Assert, Clone, E} from "web-vcore/nm/js-vextensions";
import keycode from "keycode";
import _ from "lodash";
import {runInAction} from "web-vcore/nm/mobx";
import {Button, Pre, Row, TextArea, TextInput} from "web-vcore/nm/react-vcomponents";
import {BaseComponentPlus, FilterOutUnrecognizedProps, WarnOfTransientObjectProps} from "web-vcore/nm/react-vextensions";
import {store} from "Store";
import {GetNodeView, GetNodeViewsAlongPath} from "Store/main/maps/mapViews/$mapView";
import {ES} from "Utils/UI/GlobalStyles";
import {AddNodeRevision, GetParentNode, GetFontSizeForNode, GetNodeDisplayText, GetNodeForm, missingTitleStrings, GetEquationStepNumber, ClaimForm, MapNodeL2, MapNodeRevision_titlePattern, MapNodeType, GetTermsAttached, Term, MeID, CanEditNode, Map} from "dm_common";
import {InfoButton, IsDoubleClick, Observer, ParseSegmentsForPatterns, VReactMarkdown_Remarkable} from "web-vcore";
import React from "react";
import {NodeMathUI} from "../NodeMathUI";
import {NodeUI_Inner} from "../NodeUI_Inner";
import {TermPlaceholder} from "./TermPlaceholder";

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
			return {name: `termForm`, termID: term._key, regex: new RegExp(`(^|\\W)(${_.escapeRegExp(form)})(\\W|$)`)};
		});
	});
	return ParseSegmentsForPatterns(text, patterns);*/

	//const termForm_termIDs = termsToSearchFor.SelectMany(term=>term.forms.map(a=>term._key));
	let patterns = [];
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
	{} as {parent: NodeUI_Inner, map: Map, node: MapNodeL2, path: string, indexInNodeList: number, style},
	{newTitle: null as string, editing: false, applyingEdit: false},
) {
	OnDoubleClick = ()=>{
		const {node} = this.props;
		/* const creatorOrMod = IsUserCreatorOrMod(MeID(), node);
		if (creatorOrMod && node.current.equation == null) { */
		if (CanEditNode(MeID(), node._key) && node.current.equation == null) {
			this.SetState({editing: true});
		}
	};

	OnTermHover = (termID: string, hovered: boolean)=>{
		const {parent} = this.props;
		parent.SetState({hoverPanel: hovered ? "definitions" : null, hoverTermID: hovered ? termID : null});
	};
	OnTermClick = (termID: string)=>{
		const {map, path} = this.props;
		// parent.SetState({hoverPanel: "definitions", hoverTermID: termID});
		runInAction("TitlePanel_OnTermClick", ()=>{
			let nodeView_final = GetNodeView(map._key, path);
			if (nodeView_final == null) {
				nodeView_final = GetNodeViewsAlongPath(map._key, path, true).Last();
			}
			nodeView_final.openPanel = "definitions";
			nodeView_final.openTermID = termID;
		});
	};

	render() {
		// const { map, parent, node, nodeView, path, displayText, equationNumber, style, ...rest } = this.props;
		const {map, parent, node, path, style, ...rest} = this.props;
		let {newTitle, editing, applyingEdit} = this.state;
		// UseImperativeHandle(ref, () => ({ OnDoubleClick }));

		const nodeView = GetNodeView(map._key, path);
		const latex = node.current.equation && node.current.equation.latex;
		//const isSubnode = IsNodeSubnode(node);

		const displayText = GetNodeDisplayText(node, path);
		const equationNumber = node.current.equation ? GetEquationStepNumber(path) : null;

		newTitle = newTitle != null ? newTitle : displayText;

		const noteText = (node.current.equation && node.current.equation.explanation) || node.current.note;

		const termsToSearchFor = GetTermsAttached(node.currentRevision).filter(a=>a);

		const RenderNodeDisplayText = (text: string)=>{
			const segments = GetSegmentsForTerms(text, termsToSearchFor);
			this.Stash({segments}); // for debugging

			const elements = [];
			for (const [index, segment] of segments.entries()) {
				if (segment.patternMatched == null) {
					const segmentText = segment.textParts[0];
					const edgeWhiteSpaceMatch = segmentText.match(/^( *).*?( *)$/);
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
				} else if (segment.patternMatched.name == "termForm") {
					/*const refText = segment.textParts[1];
					const termID = segment.textParts[2];*/
					const termStr = segment.textParts[2];
					//const termID = segment.patternMatched["termID"] as string;
					const term = termsToSearchFor.find(a=>a.forms.map(form=>form.toLowerCase()).Contains(termStr.toLowerCase()));
					elements.push(
						segment.textParts[1],
						<TermPlaceholder key={elements.length} refText={termStr} termID={term._key}
							onHover={hovered=>this.OnTermHover(term._key, hovered)} onClick={()=>this.OnTermClick(term._key)}/>,
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
						marginTop: !latex && GetSegmentsForTerms(newTitle, termsToSearchFor).length > 1 ? -2 : 0, // if has terms in text, bump up a bit (to offset bump-down from <sup> elements)
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
						missingTitleStrings.Contains(newTitle) && {color: "rgba(255,255,255,.3)"},
					)}>
						{latex && <NodeMathUI text={node.current.equation.text} onTermHover={this.OnTermHover} onTermClick={this.OnTermClick} termsToSearchFor={termsToSearchFor}/>}
						{!latex && RenderNodeDisplayText(newTitle)}
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
										this.SetState({editing: false});
									} else if (e.keyCode == keycode.codes.enter) {
										this.ApplyEdit();
									}
								}}
								value={newTitle} onChange={val=>this.SetState({newTitle: val})}/>}
						{!applyingEdit &&
							<Button enabled={newTitle.match(MapNodeRevision_titlePattern) != null} text="✔️" p="0 3px" style={{borderRadius: "0 5px 5px 0"}}
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
				{node.type == MapNodeType.Claim && node.current.quote &&
					<InfoButton ml={5} text="Allowed modifications: bold, [...] (collapsed segments)"/>}
			</div>
		);
	}

	async ApplyEdit() {
		const {map, node, path, newTitle} = this.PropsStateStash;

		this.SetState({applyingEdit: true});

		const parentNode = GetParentNode(path);

		const form = GetNodeForm(node, path);
		const titleKey = {[ClaimForm.Negation]: "negation", [ClaimForm.YesNoQuestion]: "yesNoQuestion"}[form] || "base";
		const newRevision = Clone(node.current);
		if (newRevision.titles[titleKey] != newTitle) {
			newRevision.titles[titleKey] = newTitle;

			const command = new AddNodeRevision({mapID: map._key, revision: newRevision});
			const revisionID = await command.Run();
			runInAction("TitlePanel.ApplyEdit", ()=>store.main.maps.nodeLastAcknowledgementTimes.set(node._key, Date.now()));
			// await WaitTillPathDataIsReceiving(DBPath(`nodeRevisions/${revisionID}`));
			// await WaitTillPathDataIsReceived(DBPath(`nodeRevisions/${revisionID}`));
			// await command.WaitTillDBUpdatesReceived();
		}
		if (this.mounted) {
			this.SetState({applyingEdit: false, editing: false});
		}
	}
}