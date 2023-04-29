import {Button, Column, Row, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {Link, Observer, RunInAction} from "web-vcore";
import {NodeL2, GetNodeDisplayText, GetTermsAttached, GetTerm, Term, Map} from "dm_common";
import {GetNodeView, GetNodeViewsAlongPath} from "Store/main/maps/mapViews/$mapView.js";
import React, {Fragment} from "react";
import {GetSegmentsForTerms} from "../../NodeBox/TitlePanel.js";

const termsPlaceholder = [];

@Observer
export class DefinitionsPanel extends BaseComponentPlus(
	{} as {show: boolean, map: Map|n, node: NodeL2, path: string, hoverTermIDs?: string[]|n, openTermIDs?: string[]|n, onHoverTerm?: (termIDs: string[])=>void, onClickTerm?: (termIDs: string[])=>void},
	{/* localHoverTerm: Term, localClickTerm: Term */},
) {
	render() {
		const {map, show, node, path, hoverTermIDs, openTermIDs, onHoverTerm, onClickTerm} = this.props;

		const displayText = GetNodeDisplayText(node, path, map);

		// let segments = ParseSegmentsFromNodeDisplayText(displayText);
		/*const segments = ParseSegmentsForPatterns(displayText, [
			{name: "term", regex: /{(.+?)\}\[(.+?)\]/},
		]);*/
		//const termsToSearchFor = GetTermsAttached(GetCurrentRevision(node.id, path, map?.id).id).filter(a=>a);
		const termsToSearchFor = GetTermsAttached(node.current.id).filter(a=>a) as Term[];
		const segments = GetSegmentsForTerms(displayText, termsToSearchFor);

		//let terms = segments.filter(a=>a.patternMatched?.name == "term").map(a=>GetTerm(a.textParts[2]));
		//let terms = segments.filter(a=>a.patternMatched).map(segment=>GetTerm(segment["termID"]));
		let terms = segments.filter(a=>a.patternMatches.size > 0).map(segment=>{
			//const termStr = segment.textParts[2];
			const mainPattern_match = [...segment.patternMatches.values()][0];
			const termStr = mainPattern_match[2];
			return termsToSearchFor.find(a=>a.forms.map(form=>form.toLowerCase()).Contains(termStr.toLowerCase()));
		});
		// only pass terms when all are loaded
		terms = terms.every(a=>a != null) ? terms : termsPlaceholder;

		const hoverTerms = hoverTermIDs ? hoverTermIDs.map(id=>GetTerm(id)) : null;
		const clickTerms = openTermIDs ? openTermIDs.map(id=>GetTerm(id)) : null;

		// let {localHoverTerm, localClickTerm} = this.state;
		// let term = localClickTerm || localHoverTerm || clickTerm || hoverTerm;
		const termsToShow = (hoverTerms ?? clickTerms ?? termsToSearchFor).filter(a=>a) as Term[];

		return (
			<Column style={{position: "relative", display: show ? null : "none"}}>
				{/*<div style={{fontSize: 12, whiteSpace: "initial"}}>
					Proponents of the claim can submit and upvote their definitions of the terms. (thus clarifying their meaning)
				</div>*/}
				{/*<Div style={{fontSize: 12, color: "rgba(255, 255, 255, 0.5)"}}>Definitions panel is under development.</Div>*/}
				{/*<Row>
					<Pre>Terms: </Pre>
					{terms.map((term, index)=> {
						return (
							<Button key={index} ml={index == 0 ? 0 : 5} text={<span>{term.name}<sup>{terms_variantNumbers[index]}</sup></span> as any}
							//<Button key={index} text={<span>{term.name}<sup>{term._id}</sup></span> as any}
								//onMouseEnter={e=>this.SetState({localHoverTerm: term})} onMouseLeave={e=>this.SetState({localHoverTerm: null})}
								onMouseEnter={e=>onHoverTerm(term._id)} onMouseLeave={e=>onHoverTerm(null)}
								onClick={e=> {
									//this.SetState({localClickTerm: term});
									onClickTerm(term._id);
								}}/>
						);
					})}
				</Row>*/}
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
	}
}

export class TermDefinitionPanel extends BaseComponentPlus({showID: true} as {term: Term, showID?: boolean}, {}) {
	render() {
		const {term, showID} = this.props;

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
				{/* <Row>Details:</Row>
				<TermDetailsUI baseData={term} creating={false} enabled={/*creatorOrMod*#/ false} style={{padding: 10}}
					onChange={data=>this.SetState({selectedTerm_newData: data})}/> */}
			</Column>
		);
	}
}