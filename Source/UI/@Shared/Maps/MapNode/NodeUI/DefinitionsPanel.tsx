import {browserHistory} from "../../../../../Frame/Store/CreateStore";
import Column from "../../../../../Frame/ReactComponents/Column";
import {Div, BaseComponent, Pre} from "../../../../../Frame/UI/ReactGlobals";
import {MapNode} from "../../../../../Store/firebase/nodes/@MapNode";
import {GetNodeDisplayText} from "../../../../../Store/firebase/nodes/$node";
import {ParseSegmentsFromNodeDisplayText} from "../NodeDisplayTextParser";
import {GetTerm, GetTermVariantNumber} from "../../../../../Store/firebase/terms";
import {Connect} from "../../../../../Frame/Database/FirebaseConnect";
import {CachedTransform} from "../../../../../Frame/V/VCache";
import Row from "../../../../../Frame/ReactComponents/Row";
import {Term} from "../../../../../Store/firebase/terms/@Term";
import Button from "../../../../../Frame/ReactComponents/Button";
import TermDetailsUI from "../../../../Content/Terms/TermDetailsUI";
import TermComponentsUI from "../../../../Content/Terms/TermComponentsUI";
import {IsUserCreatorOrMod} from "../../../../../Store/firebase/userExtras";
import {GetUserID} from "../../../../../Store/firebase/users";
import {URL} from "../../../../../Frame/General/URLs";
import {replace, push} from "react-router-redux";
import {ACTTermSelect} from "../../../../../Store/main";
import {PropTypes} from "react";
import {historyStore} from "../../../../Root";

let termsPlaceholder = [];

@Connect((state, {node, path, hoverTermID, clickTermID})=> {
	let displayText = GetNodeDisplayText(node, path);
	let segments = ParseSegmentsFromNodeDisplayText(displayText);
	let terms = segments.filter(a=>a.type == "term").map(a=>GetTerm(a.textParts[2].ToInt()));
	let terms_variantNumbers = terms.map(a=>a ? GetTermVariantNumber(a) : 1);
	return {
		// only pass terms when all are loaded
		terms: CachedTransform("terms_transform1", {path}, terms, ()=>terms.All(a=>a != null) ? terms : termsPlaceholder),
		terms_variantNumbers: CachedTransform("terms_variantNumbers_transform1", {path}, terms_variantNumbers, ()=>terms_variantNumbers),
		hoverTerm: hoverTermID ? GetTerm(hoverTermID) : null,
		clickTerm: clickTermID ? GetTerm(clickTermID) : null,
	};
})
export default class DefinitionsPanel extends BaseComponent
		<{node: MapNode, path: string, hoverTermID?: number, clickTermID?: number, onHoverTerm?: (termID: number)=>void, onClickTerm?: (termID: number)=>void}
			& Partial<{terms: Term[], terms_variantNumbers: number[], hoverTerm: Term, clickTerm: Term}>,
		{/*localHoverTerm: Term, localClickTerm: Term*/}> {
	render() {
		let {node, path, terms, terms_variantNumbers, hoverTerm, clickTerm, onHoverTerm, onClickTerm} = this.props;
		//let {localHoverTerm, localClickTerm} = this.state;
		//let term = localClickTerm || localHoverTerm || clickTerm || hoverTerm;
		let term = clickTerm || hoverTerm;

		return (
			<Column style={{position: "relative"}}>
				{/*<div style={{fontSize: 12, whiteSpace: "initial"}}>
					Proponents of the thesis can submit and upvote their definitions of the terms. (thus clarifying their meaning)
				</div>*/}
				{/*<Div style={{fontSize: 12, color: "rgba(255, 255, 255, 0.5)"}}>Definitions panel is under development.</Div>*/}
				<Row>
					<Pre>Terms: </Pre>
					{terms.map((term, index)=> {
						return (
							<Button key={index} text={<span>{term.name}<sup>{terms_variantNumbers[index]}</sup></span> as any}
							//<Button key={index} text={<span>{term.name}<sup>{term._id}</sup></span> as any}
								//onMouseEnter={e=>this.SetState({localHoverTerm: term})} onMouseLeave={e=>this.SetState({localHoverTerm: null})}
								onMouseEnter={e=>onHoverTerm(term._id)} onMouseLeave={e=>onHoverTerm(null)}
								onClick={e=> {
									//this.SetState({localClickTerm: term});
									onClickTerm(term._id);
								}}/>
						);
					})}
				</Row>
				{term && <TermDefinitionPanel term={term} termVariantNumber={terms_variantNumbers[terms.indexOf(term)]}/>}
			</Column>
		);
	}
}

class TermDefinitionPanel extends BaseComponent<{term: Term, termVariantNumber: number}, {}> {
	/*static contextTypes = {
		router: PropTypes.shape({
			history: PropTypes.shape({
				push: PropTypes.func.isRequired,
				replace: PropTypes.func.isRequired,
				createHref: PropTypes.func.isRequired
			}).isRequired
		}).isRequired
	};*/
	render() {
		let {term, termVariantNumber} = this.props;

		//let creatorOrMod = term != null && IsUserCreatorOrMod(GetUserID(), term);

		return (
			<Column mt={5}>
				<Row>Name: {term.name} (variant #{termVariantNumber})</Row>
				<Row mt={5}>Components:</Row>
				<TermComponentsUI term={term} editing={false} inMap={true} style={{padding: "5px 0 10px"}}/>
				{/*<Row>Details:</Row>
				<TermDetailsUI baseData={term} creating={false} enabled={/*creatorOrMod*#/ false} style={{padding: 10}}
					onChange={data=>this.SetState({selectedTerm_newData: data})}/>*/}
				<Button text="Show details" onClick={e=> {
					let newURL = URL.Current().Clone();
					newURL.pathNodes = ["content"];
					newURL.queryVars = [];
					//browserHistory.push(newURL.toString({domain: false}));
					//(this.props as any).router.push(newURL.toString({domain: false}));
					//store.dispatch(push(newURL.toString({domain: false})));
					historyStore.push(newURL.toString({domain: false}));
					/*store.dispatch({
						type: "@@router/LOCATION_CHANGE",
						payload: {
							pathname: "/content",
							search: "",
							hash: "",
							key: Math.random(),
						}
					});*/
					store.dispatch(new ACTTermSelect({id: term._id}));
				}}/>
			</Column>
		);
	}
}