import {Assert, Clone, E} from "js-vextensions";
import keycode from "keycode";
import _ from "lodash";
import {Button, Pre, Row, TextArea} from "react-vcomponents";
import {FilterOutUnrecognizedProps} from "react-vextensions";
import {store} from "Store";
import {GetNodeView, GetNodeViewsAlongPath} from "Store/main/maps/mapViews/$mapView.js";
import {GetFontSizeForNode, GetNodeDisplayText, missingTitleStrings, GetEquationStepNumber, NodeRevision_titlePattern, NodeType, GetTermsAttached, Term, MeID, DMap, NodeRevision, TitleKey, AsNodeRevisionInput, GetTitleIntegratedAttachment, NodeL3, GetNodeRawTitleAndSuch, PERMISSIONS} from "dm_common";
import {ES, IsDoubleClick, ParseTextForPatternMatchSegments, RunInAction, VReactMarkdown_Remarkable, HTMLProps_Fixed} from "web-vcore";
import React, {Ref, useCallback, useEffect, useImperativeHandle, useRef} from "react";
import {GetAsync} from "mobx-graphlink";
import {SLMode} from "UI/@SL/SL.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {RunCommand_AddNodeRevision} from "Utils/DB/Command.js";
import {DraggableProvidedDragHandleProps} from "@hello-pangea/dnd";
import {NodeMathUI} from "../NodeMathUI.js";
import {TermPlaceholder} from "./TermPlaceholder.js";
import {observer_mgl} from "mobx-graphlink";
import {JSX} from "react";

// TODO: loadingUI was commented while converting to functional component
//
//	loadingUI(bailInfo: BailInfo) {
//		return (
//			<DefaultLoadingUI comp={bailInfo.comp} bailMessage={bailInfo.bailMessage}
//				// TitlePanel *must* render an element with the drag-handle-props to avoid dnd-lib complaining, so if bail-error is present atm (ie. data loading), render those props onto an empty div
//				extraUI_inRoot={<div {...this.props.dragHandleProps}/>}/>
//		);
//	}

type Props = {
	map: DMap|n,
	node: NodeL3,
	path: string,
	indexInNodeList: number,
	style: React.CSSProperties,
	dragHandleProps: DraggableProvidedDragHandleProps|n,
	ref?: Ref<TitlePanelElement|n>,
	setParentState?: (state: any)=>void,
} & Omit<HTMLProps_Fixed<"div">, "ref">;

type State = {
	editing: boolean,
	edit_newTitle: string|n,
	edit_titleKey: TitleKey|n,
	applyingEdit: boolean,
};

export type TitlePanelElement = HTMLElement & {
	onDoubleClick: ()=>void,
};

export const TitlePanel = observer_mgl((props: Props)=>{
	const {map, setParentState, ref, node, path, style, onClick, dragHandleProps, ...rest} = props;
	const [{editing, edit_newTitle, applyingEdit, edit_titleKey}, setState] = React.useState<State>({
		editing: false,
		edit_newTitle: null as string|n,
		edit_titleKey: null as TitleKey|n,
		applyingEdit: false,
	});
	const rowRef = useRef<HTMLElement|n>(null);

	const isMountedRef = useRef(false);
	useEffect(()=>{
		isMountedRef.current = true;
	  return ()=>{
	    isMountedRef.current = false;
	  };
	}, []);

	const titleAttachment = GetTitleIntegratedAttachment(node.current);
	const latex = titleAttachment?.equation?.latex;
	const displayText = GetNodeDisplayText(node, path, map);
	const equationNumber = titleAttachment?.equation ? GetEquationStepNumber(path) : null;
	const noteText = (titleAttachment?.equation && titleAttachment?.equation.explanation) || node.current.phrasing.note;
	const termsToSearchFor = GetTermsAttached(node.current.id).filter(a=>a) as Term[];

	const onDoubleClick = useCallback(async()=>{
		// ignore double-clicks on arguments (their text is determined automatically,
		// so setting a custom value for the text field is just confusing)
		if (node.type == NodeType.argument) return;

		const tA = GetTitleIntegratedAttachment(node.current);
		const {titleInfo} = await GetAsync(()=>{
			return {
				titleInfo: GetNodeRawTitleAndSuch(node, path),
			};
		});

		if (PERMISSIONS.Node.Modify(MeID(), node) && tA?.equation == null) {
			setState(prevState=>({
				...prevState,
				editing: true,
				edit_newTitle: titleInfo.rawTitle,
				edit_titleKey: titleInfo.usedField,
			}));
		}
	}, [node, path]);

	const onTermHover = (termIDs: string[], hovered: boolean)=>{
		if (setParentState){
			setParentState({lastHoveredPanel: hovered ? "definitions" : null, hoverTermIDs: hovered ? termIDs : null});
		}
	}

	const onTermClick = (termIDs: string[])=>{
		RunInAction("TitlePanel_OnTermClick", ()=>{
			let newViewFinal = GetNodeView(map?.id, path);
			if (newViewFinal == null) {
				newViewFinal = GetNodeViewsAlongPath(map?.id, path, true).Last();
			}
			newViewFinal.openPanel = "definitions";
			newViewFinal.openTermIDs = termIDs;
		});
	};

	const applyEdit = async()=>{
		if (edit_newTitle == null) return; // wait till loaded, within render() [yes, this could benefit from a cleanup]

		setState(prevState=>({...prevState, applyingEdit: true}));

		const newRevision = (Clone(node.current) as NodeRevision).OmitUndefined(true);
		if (newRevision.phrasing[edit_titleKey!] != edit_newTitle) {
			newRevision.phrasing[edit_titleKey!] = edit_newTitle;

			const {id: revisionID} = await RunCommand_AddNodeRevision({mapID: map?.id, revision: AsNodeRevisionInput(newRevision)});
			RunInAction("TitlePanel.ApplyEdit", ()=>store.main.maps.nodeLastAcknowledgementTimes.set(node.id, Date.now()));
		}

		if (isMountedRef.current){
			setState(prevState=>({
				...prevState,
				editing: false,
				edit_newTitle: null,
				applyingEdit: false,
			}));
		}
	}

	useImperativeHandle(ref, ()=>{
		const el = rowRef.current;
		if (el) {
			const elExt = el as TitlePanelElement;
			elExt.onDoubleClick = onDoubleClick;
			return elExt;
		}
		return null as any;
	}, [onDoubleClick]);

	return (
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
			)}
			onClick={e=>{
				if (IsDoubleClick(e)) onDoubleClick();
				if (onClick) return onClick(e);
			}}
			ref={el=>{
				rowRef.current = el?.root;
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
					},
					titleAttachment == null && missingTitleStrings.Contains(displayText) && {color: "rgba(255,255,255,.3)"},
				)}>
					{titleAttachment?.equation && latex && <NodeMathUI text={titleAttachment.equation.text}
						onTermHover={(id, hovered)=>onTermHover([id], hovered)}
						onTermClick={id=>onTermClick([id])}
						termsToSearchFor={termsToSearchFor}/>}
					{!latex && RenderNodeDisplayText(displayText, termsToSearchFor, {
						onTermHover,
						onTermClick,
					})}
					{noteText &&
						<span style={{
							fontSize: 11, color: liveSkin.NodeTextColor().alpha(liveSkin.NodeTextColor().alpha() * .7).toString(),
							marginLeft: 15,
							marginTop: GetSegmentsForTerms(noteText, termsToSearchFor).length > 1 ? -1 : 3, float: "right", // if has terms in note, bump up a bit (to offset bump-down from <sup> elements)
						}}>
							{RenderNodeDisplayText(noteText, termsToSearchFor, {
								onTermHover,
								onTermClick,
							})}
						</span>}
				</span>}
			{editing &&
				<Row style={E(
					{flex: 1, position: "relative", whiteSpace: "initial", alignItems: "stretch"},
				)}>
					{!applyingEdit &&
						<TextArea required={true} pattern={NodeRevision_titlePattern} allowLineBreaks={false} autoSize={true} style={E({flex: 1, minWidth: 0})}
							instant // must be instant-apply, since rb-dnd blocks button-triggered on-blur
							ref={a=>{
								if (a == null) return;
								a.DOM_HTML.focus()
							}}
							onKeyDown={e=>{
								if (e.keyCode == keycode.codes.esc) {
									setState(prevState=>({
										...prevState,
										editing: false,
										edit_newTitle: null,
									}));
								} else if (e.keyCode == keycode.codes.enter) {
									applyEdit();
								}
							}}
							value={edit_newTitle!}
							onChange={val=>setState(prevState=>({...prevState, edit_newTitle: val}))}
						/>
					}
					{!applyingEdit &&
						<Button enabled={edit_newTitle!.match(NodeRevision_titlePattern) != null} text="✔️" p="0 3px" style={{borderRadius: "0 5px 5px 0"}}
							onClick={()=>applyEdit()}/>}
					{applyingEdit && <Row>Applying edit...</Row>}
				</Row>}
		</Row>
	);
});

export const GetSegmentsForTerms = (text: string, termsToSearchFor: Term[])=>{
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

type TitlePanel_TermHandlers = {
    onTermHover: (termIDs: string[], hovered: boolean) => void;
    onTermClick: (termIDs: string[]) => void;
};

export const RenderNodeDisplayText = (text: string, termsToSearchFor: Term[], termHandlers: TitlePanel_TermHandlers|n)=>{
	const segments = GetSegmentsForTerms(text, termsToSearchFor);

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
					useBasicTooltip={termHandlers == null}
					onHover={hovered=>termHandlers?.onTermHover(termIDs, hovered)}
					onClick={()=>termHandlers?.onTermClick(termIDs)}/>,
				mainPattern_match[3],
			);
		} else {
			Assert(false);
		}
	}

	return elements;
}
