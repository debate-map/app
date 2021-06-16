import {Button, Column, Row} from "web-vcore/nm/react-vcomponents";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions";
import {Link, Observer, ParseSegmentsForPatterns} from "web-vcore";
import {MapNodeL2, GetNodeDisplayText, GetTermsAttached, GetTerm, Term} from "@debate-map/server-link/Source/Link";


import {GetSegmentsForTerms} from "../../NodeUI_Inner/TitlePanel";

const termsPlaceholder = [];

@Observer
export class DefinitionsPanel extends BaseComponentPlus(
	{} as {show: boolean, node: MapNodeL2, path: string, hoverTermID?: string, openTermID?: string, onHoverTerm?: (termID: string)=>void, onClickTerm?: (termID: string)=>void},
	{/* localHoverTerm: Term, localClickTerm: Term */},
) {
	render() {
		const {show, node, path, hoverTermID, openTermID, onHoverTerm, onClickTerm} = this.props;

		const displayText = GetNodeDisplayText(node, path);

		// let segments = ParseSegmentsFromNodeDisplayText(displayText);
		/*const segments = ParseSegmentsForPatterns(displayText, [
			{name: "term", regex: /{(.+?)\}\[(.+?)\]/},
		]);*/
		const termsToSearchFor = GetTermsAttached(node.currentRevision).filter(a=>a);
		const segments = GetSegmentsForTerms(displayText, termsToSearchFor);

		//let terms = segments.filter(a=>a.patternMatched?.name == "term").map(a=>GetTerm(a.textParts[2]));
		//let terms = segments.filter(a=>a.patternMatched).map(segment=>GetTerm(segment["termID"]));
		let terms = segments.filter(a=>a.patternMatched).map(segment=>{
			const termStr = segment.textParts[2];
			return termsToSearchFor.find(a=>a.forms.map(form=>form.toLowerCase()).Contains(termStr.toLowerCase()));
		});
		// only pass terms when all are loaded
		terms = terms.every(a=>a != null) ? terms : termsPlaceholder;

		const hoverTerm = hoverTermID ? GetTerm(hoverTermID) : null;
		const clickTerm = openTermID ? GetTerm(openTermID) : null;

		// let {localHoverTerm, localClickTerm} = this.state;
		// let term = localClickTerm || localHoverTerm || clickTerm || hoverTerm;
		const term = hoverTerm || clickTerm;

		return (
			<Column style={{position: "relative", display: show ? null : "none"}}>
				{/* <div style={{fontSize: 12, whiteSpace: "initial"}}>
					Proponents of the claim can submit and upvote their definitions of the terms. (thus clarifying their meaning)
				</div> */}
				{/* <Div style={{fontSize: 12, color: "rgba(255, 255, 255, 0.5)"}}>Definitions panel is under development.</Div> */}
				{/* <Row>
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
				</Row> */}
				{term && <TermDefinitionPanel term={term}/>}
				{!term && terms.length > 0 &&
					<div style={{fontSize: 12, whiteSpace: "initial"}}>Select a highlighted term above to see the definition for it here.</div>}
				{!term && terms.length == 0 &&
					<div style={{fontSize: 12, whiteSpace: "initial"}}>This node does not currently have any term definitions attached.</div>}
			</Column>
		);
	}
}

export class TermDefinitionPanel extends BaseComponentPlus({showID: true} as {term: Term, showID?: boolean}, {}) {
	render() {
		const {term, showID} = this.props;

		const formsStr = term.forms.length > 1 ? ` [${term.forms.slice(1).join(", ")}]` : "";
		const disambiguationStr = term.disambiguation ? ` (${term.disambiguation})` : "";
		const idStr = showID ? ` (id: ${term._key})` : "";
		return (
			<Column sel style={{whiteSpace: "normal"}}>
				<Row>Term: {term.name}{formsStr}{disambiguationStr}{idStr}</Row>
				<Row mt={5} style={{whiteSpace: "pre-wrap"}}>Definition: {term.definition}</Row>
				{/* <Row>Details:</Row>
				<TermDetailsUI baseData={term} creating={false} enabled={/*creatorOrMod*#/ false} style={{padding: 10}}
					onChange={data=>this.SetState({selectedTerm_newData: data})}/> */}
				<Link style={{marginTop: 5, alignSelf: "flex-start"}} onContextMenu={e=>e.nativeEvent["handled"] = true} actionFunc={s=>{
					s.main.page = "database";
					s.main.database.subpage = "terms";
					s.main.database.selectedTermID = term._key;
				}}>
					<Button text="Show details"/>
				</Link>
			</Column>
		);
	}
}