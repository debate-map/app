import {Assert} from "../../Frame/General/Assert";
import {SubNavBarButton} from "../@Shared/SubNavBar";
import SubNavBar from "../@Shared/SubNavBar";
import {BaseComponent, SimpleShouldUpdate, FindDOM, Div, Span, Pre} from "../../Frame/UI/ReactGlobals";
import VReactMarkdown from "../../Frame/ReactComponents/VReactMarkdown";
import ScrollView from "react-vscrollview";
import {styles} from "../../Frame/UI/GlobalStyles";
import Column from "../../Frame/ReactComponents/Column";
import Row from "../../Frame/ReactComponents/Row";
import Button from "../../Frame/ReactComponents/Button";
import {Connect} from "../../Frame/Database/FirebaseConnect";
import {GetTerms} from "../../Store/firebase/terms";
import {Term, TermType} from "../../Store/firebase/terms/@Term";
import {PermissionGroupSet} from "../../Store/firebase/userExtras/@UserExtraInfo";
import {GetUserPermissionGroups, GetUserID} from "../../Store/firebase/users";
import {ShowSignInPopup} from "../@Shared/NavBar/UserPanel";
import {ShowAddTermDialog} from "./Terms/AddTermDialog";
import { ACTTermSelect, GetSelectedTermID, GetSelectedTerm } from "../../Store/main";
import TermEditorUI from "./Terms/TermEditorUI";
import {RemoveHelpers} from "../../Frame/Database/DatabaseHelpers";
import UpdateNodeDetails from "../../Server/Commands/UpdateNodeDetails";
import UpdateTermData from "../../Server/Commands/UpdateTermData";
import {IsUserCreatorOrMod} from "../../Store/firebase/userExtras";
import DeleteTerm from "../../Server/Commands/DeleteTerm";
import {ShowMessageBox} from "../../Frame/UI/VMessageBox";
import * as Moment from "moment";
import TermComponentsEditorUI from "../../UI/Content/Terms/TermComponentsEditorUI";

@Connect(state=> ({
	terms: GetTerms(),
	selectedTerm: GetSelectedTerm(),
	permissions: GetUserPermissionGroups(GetUserID()),
}))
export default class TermsUI extends BaseComponent
		<{} & Partial<{terms: Term[], selectedTerm: Term, permissions: PermissionGroupSet}>,
		{selectedTerm_newData: Term}> {
	ComponentWillReceiveProps(props) {
		if (props.selectedTerm != this.props.selectedTerm) {
			this.SetState({selectedTerm_newData: null});
		}
	}

	scrollView: ScrollView;
	render() {
		let {terms, selectedTerm, permissions} = this.props;
		if (terms == null) return <div>Loading terms...</div>;
		let userID = GetUserID();
		let {selectedTerm_newData} = this.state;

		let creatorOrMod = selectedTerm != null && IsUserCreatorOrMod(userID, selectedTerm);
		
		return (
			<Row p="10px 7px" style={{height: "100%", alignItems: "flex-start"}}>
				<Column style={{position: "relative", flex: .4, height: "100%", background: "rgba(0,0,0,.5)", borderRadius: 10}} onClick={e=> {
					if (e.target == e.currentTarget || e.target == FindDOM(this.scrollView) || e.target == FindDOM(this.scrollView.refs.content)) {
						store.dispatch(new ACTTermSelect({id: null}));
					}
				}}>
					<Row style={{height: 40, justifyContent: "center", background: "rgba(0,0,0,.7)", borderRadius: "10px 10px 0 0"}}>
						<Div p={7} style={{position: "absolute", left: 0}}>
							<Button text="Add term" onClick={e=> {
								if (userID == null) return ShowSignInPopup();
								ShowAddTermDialog(userID);
							}}/>
						</Div>
						<Div style={{fontSize: 17, fontWeight: 500}}>
							Terms
						</Div>
					</Row>
					<ScrollView ref={c=>this.scrollView = c} contentStyle={{flex: 1, padding: 10}}>
						{terms.map((term, index)=> {
							return <TermUI key={index} first={index == 0} term={term} selected={selectedTerm == term}/>;
						})}
					</ScrollView>
				</Column>
				<Column ml={10} style={{flex: .6}}>
					<Column style={{position: "relative", maxHeight: "100%", background: "rgba(0,0,0,.5)", borderRadius: 10}}>
						<Row style={{height: 40, justifyContent: "center", background: "rgba(0,0,0,.7)", borderRadius: "10px 10px 0 0"}}>
							{selectedTerm &&
								<Div style={{fontSize: 17, fontWeight: 500}}>
									{selectedTerm.name}
								</Div>}
							<Div p={7} style={{position: "absolute", right: 0}}>
								<Button ml="auto" text="Save details" enabled={selectedTerm_newData != null} onClick={async e=> {
									let updates = RemoveHelpers(selectedTerm_newData.Including("name", "type", "person", "shortDescription_current"));
									await new UpdateTermData({termID: selectedTerm._id, updates}).Run();
									this.SetState({selectedTerm_newData: null});
								}}/>
								<Button text="Delete term" ml={10} enabled={selectedTerm != null} onClick={async e=> {
									ShowMessageBox({
										title: `Delete "${selectedTerm.name}"`, cancelButton: true,
										message: `Delete the term "${selectedTerm.name}"?`,
										onOK: async ()=> {
											await new DeleteTerm({termID: selectedTerm._id}).Run();
										}
									});
								}}/>
							</Div>
						</Row>
						{selectedTerm
							? <TermEditorUI baseData={selectedTerm} newTerm={false} enabled={creatorOrMod} style={{padding: 10}}
									onChange={data=>this.SetState({selectedTerm_newData: data})}/>
							: <div style={{padding: 10}}>No term selected.</div>}
					</Column>
					<Column mt={10} style={{position: "relative", maxHeight: "100%", background: "rgba(0,0,0,.5)", borderRadius: 10}}>
						<Row style={{height: 40, justifyContent: "center", background: "rgba(0,0,0,.7)", borderRadius: "10px 10px 0 0"}}>
							<Div style={{/*fontSize: 17,*/ fontWeight: 500}}>
								{/*Components*/}
								{selectedTerm ? GetHelperTextForTermType(selectedTerm) : null}
							</Div>
							{/*<Div p={7} style={{position: "absolute", right: 0}}>
								<Button ml="auto" text="Save term" enabled={selectedTerm_newData != null} onClick={async e=> {
									let updates = RemoveHelpers(selectedTerm_newData.Including("name", "type", "person", "shortDescription_current"));
									await new UpdateTermData({termID: selectedTerm._id, updates}).Run();
									this.SetState({selectedTerm_newData: null});
								}}/>
								<Button text="Delete term" ml={10} enabled={selectedTerm != null} onClick={async e=> {
									ShowMessageBox({
										title: `Delete "${selectedTerm.name}"`, cancelButton: true,
										message: `Delete the term "${selectedTerm.name}"?`,
										onOK: async ()=> {
											await new DeleteTerm({termID: selectedTerm._id}).Run();
										}
									});
								}}/>
							</Div>*/}
						</Row>
						{/*<Pre style={{textAlign: "center"}}>{GetHelperTextForTermType(selectedTerm)}</Pre>*/}
						{selectedTerm
							? <TermComponentsEditorUI term={selectedTerm} style={{marginTop: 10, padding: 10}}/>
							: <div style={{padding: 10}}>No term selected.</div>}
					</Column>
				</Column>
			</Row>
		);
	}
}

function GetHelperTextForTermType(term: Term) {
	/*if (type == TermType.Noun_Object) return `Something is a${name.toLowerCase().StartsWithAny("a", "e", "i", "o", "u") ? "n" : ""} "${name}" (according to the above) if it...`;
	if (type == TermType.Noun_Gerund) return `To be doing "${name}" (according to the above) is to be...`;
	if (type == TermType.Adjective) return `To be "${name}" (according to the above) is to be...`;
	if (type == TermType.Verb) return `To "${name}" (according to the above) is to...`;
	if (type == TermType.Adverb) return `To do something "${name}" (according to the above) is to do something...`;*/
	//if (type == TermType.Noun_Object) return `For a person/object to be a${name.toLowerCase().StartsWithAny("a", "e", "i", "o", "u") ? "n" : ""} "${name}", it must...`;
	
	/*if (type == TermType.Noun_Object) return `If something is a${name.toLowerCase().StartsWithAny("a", "e", "i", "o", "u") ? "n" : ""} "${name}" (according to the description above), it...`;
	if (type == TermType.Noun_Gerund) return `If something is "${name}" (according to the description above), it is...`;
	if (type == TermType.Adjective) return `If something is "${name}" (according to the description above), it...`;
	//if (type == TermType.Verb) return `For something to "${name}", it...`;
	if (type == TermType.Verb) return `To "${name}" (according to the description above) is to...`;
	if (type == TermType.Adverb) return `If something performs an action "${name}" (according to the description above), it does so...`;*/

	if (term.type == TermType.SpecificEntity) return `"${term.name}" (according to the description above) is ${term.person ? "someone who" : "something which"}...`;
	//if (term.type == TermType.EntityType) return `If something is a${term.name.toLowerCase().StartsWithAny(..."aeiou".split("")) ? "n" : ""} ${term.name} (according to the description above), it is...`;
	if (term.type == TermType.EntityType) return `A${term.name.toLowerCase().StartsWithAny(..."aeiou".split("")) ? "n" : ""} "${term.name
		}" (according to the description above) is ${term.person ? "someone who" : "something which"}...`;
	if (term.type == TermType.Adjective) return `If something is "${term.name}" (according to the description above), it is...`;
	//if (type == TermType.Verb) return `For something to "${name}", it...`;
	if (term.type == TermType.Action) return `To "${term.name}" (according to the description above) is to...`;
	if (term.type == TermType.Adverb) return `If an action is performed "${term.name}" (according to the description above), it is done...`;
	
	Assert(false);
}

type TermUI_Props = {term: Term, first: boolean, selected: boolean};
export class TermUI extends BaseComponent<TermUI_Props, {}> {
	render() {
		let {term, first, selected} = this.props;
		return (
			<Row mt={first ? 0 : 5} className="cursorSet"
					style={E(
						{padding: 5, background: "rgba(100,100,100,.5)", borderRadius: 5, cursor: "pointer"},
						selected && {background: "rgba(100,100,100,.7)"},
					)}
					onClick={e=> {
						store.dispatch(new ACTTermSelect({id: term._id}));
					}}>
				{term.name}: {term.shortDescription_current}
				<Span ml="auto">
					<Pre style={{opacity: .7}}>({TermType[term.type].replace(/.([A-Z])/g, m=>m[0] + " " + m[1]).toLowerCase()}) </Pre>
					<span>#{term._id}</span>
				</Span>
			</Row>
		);
	}
}

/**/