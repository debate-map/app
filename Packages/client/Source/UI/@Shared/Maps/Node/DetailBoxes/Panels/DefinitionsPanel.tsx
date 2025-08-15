import {Button, Column, Row, Text} from "react-vcomponents";
import {Link, RunInAction} from "web-vcore";
import {NodeL2, GetNodeDisplayText, GetTermsAttached, GetTerm, Term, DMap} from "dm_common";
import {GetNodeView, GetNodeViewsAlongPath} from "Store/main/maps/mapViews/$mapView.js";
import React, {Fragment} from "react";
import {GetSegmentsForTerms} from "../../NodeBox/TitlePanel.js";
import {observer_mgl} from "mobx-graphlink";

const termsPlaceholder = [];

export type DefinitionsPanel_Props = {
	show: boolean,
	map: DMap|n,
	node: NodeL2,
	path: string,
	hoverTermIDs?: string[]|n,
	openTermIDs?: string[]|n,
	onHoverTerm?: (termIDs: string[])=>void,
	onClickTerm?: (termIDs: string[])=>void
};

export const DefinitionsPanel = observer_mgl((props: DefinitionsPanel_Props)=>{
	const {map, show, node, path, hoverTermIDs, openTermIDs} = props;

	const displayText = GetNodeDisplayText(node, path, map);
	const termsToSearchFor = GetTermsAttached(node.current.id).filter(a=>a) as Term[];
	const segments = GetSegmentsForTerms(displayText, termsToSearchFor);

	let terms = segments.filter(a=>a.patternMatches.size > 0).map(segment=>{
		const mainPattern_match = [...segment.patternMatches.values()][0];
		const termStr = mainPattern_match[2];
		return termsToSearchFor.find(a=>a.forms.map(form=>form.toLowerCase()).Contains(termStr.toLowerCase()));
	});
	terms = terms.every(a=>a != null) ? terms : termsPlaceholder;

	const hoverTerms = hoverTermIDs ? hoverTermIDs.map(id=>GetTerm(id)) : null;
	const clickTerms = openTermIDs ? openTermIDs.map(id=>GetTerm(id)) : null;
	const termsToShow = (hoverTerms ?? clickTerms ?? termsToSearchFor).filter(a=>a) as Term[];

	return (
		<Column style={{position: "relative", display: show ? null : "none"}}>
			{termsToShow.length > 0 && termsToShow.map((term, index)=>{
				return <Fragment key={index}>
					{index > 0 && <div style={{marginTop: 7, marginBottom: 5, border: "1px solid rgba(255,255,255,.3)"}}/>}
					<TermDefinitionPanel term={term}/>
				</Fragment>;
			})}
			{termsToShow.length < termsToSearchFor.length &&
			<>
				<div style={{marginTop: 7, marginBottom: 5, border: "1px solid rgba(255,255,255,.3)"}}/>
				<Button p="3px 7px" text={`Show all attached terms (+${termsToSearchFor.length - termsToShow.length})`} onClick={()=>{
					RunInAction("DefinitionsPanel_ShowAllTermsForNode", ()=>{
						let nodeView_final = GetNodeView(map?.id, path);
						if (nodeView_final == null) {
							nodeView_final = GetNodeViewsAlongPath(map?.id, path, true).Last();
						}
						nodeView_final.openTermIDs = undefined; // by clearing the open-terms list, DefinitionsPanel just displays all attached terms
					});
				}}/>
			</>}
			{termsToShow.length == 0 && terms.length > 0 &&
				<div style={{fontSize: 12, whiteSpace: "initial"}}>Select a highlighted term above to see the definition for it here.</div>}
			{termsToShow.length == 0 && terms.length == 0 &&
				<div style={{fontSize: 12, whiteSpace: "initial"}}>The current phrasing being shown does not currently have any term definitions attached.</div>}
		</Column>
	);
});

export type TermDefinitionPanel_Props = {
	term: Term;
	showID?: boolean;
};

export const TermDefinitionPanel = (props: TermDefinitionPanel_Props)=>{
	const {term, showID = true} = props;

	const formsStr = term.forms.length > 1 ? ` [${term.forms.slice(1).join(", ")}]` : "";
	const disambiguationStr = term.disambiguation ? ` (${term.disambiguation})` : "";
	const idStr = showID ? ` (id: ${term.id})` : "";

	return (
		<Column sel style={{whiteSpace: "normal"}}>
			<Row center>
				<Text>Term: {term.name}{formsStr}{disambiguationStr}{idStr}</Text>
				<Link onContextMenu={e=>e.nativeEvent["handled"] = true} actionFunc={s=>{
					s.main.page = "database";
					s.main.database.subpage = "terms";
					s.main.database.selectedTermID = term.id;
				}}>
					<Button ml={5} p="3px 7px" text="Show details"/>
				</Link>
			</Row>

			<Row mt={5} style={{whiteSpace: "pre-wrap"}}>Definition: {term.definition}</Row>
		</Column>
	);
};
