import {Assert} from "js-vextensions";
import {Button, Column, Div, Pre, Row, Span} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";
import {ShowMessageBox} from "react-vmessagebox";
import {ScrollView} from "react-vscrollview";
import {RemoveHelpers} from "../../Frame/Database/DatabaseHelpers";
import {Connect} from "../../Frame/Database/FirebaseConnect";
import DeleteTerm from "../../Server/Commands/DeleteTerm";
import UpdateTermData from "../../Server/Commands/UpdateTermData";
import {GetFullNameP, GetTermVariantNumber, GetTerms} from "../../Store/firebase/terms";
import {Term, TermType} from "../../Store/firebase/terms/@Term";
import {IsUserCreatorOrMod} from "../../Store/firebase/userExtras";
import {PermissionGroupSet} from "../../Store/firebase/userExtras/@UserExtraInfo";
import {GetUserID, GetUserPermissionGroups} from "../../Store/firebase/users";
import {ACTTermSelect, GetSelectedTerm} from "../../Store/main/database";
import TermComponentsUI from "../../UI/Content/Terms/TermComponentsUI";
import {ShowSignInPopup} from "../@Shared/NavBar/UserPanel";
import {ShowAddTermComponentDialog} from "./Terms/AddTermComponentDialog";
import TermDetailsUI, {ShowAddTermDialog} from "./Terms/TermDetailsUI";

type Props = {} & Partial<{terms: Term[], selectedTerm: Term, permissions: PermissionGroupSet}>;
@Connect(state=> ({
	terms: GetTerms(),
	selectedTerm: GetSelectedTerm(),
	permissions: GetUserPermissionGroups(GetUserID()),
}))
export default class TermsUI extends BaseComponent<Props, {selectedTerm_newData: Term, selectedTerm_newDataError: string}> {
	ComponentWillReceiveProps(props) {
		if (props.selectedTerm != this.props.selectedTerm) {
			this.SetState({selectedTerm_newData: null, selectedTerm_newDataError: null});
		}
	}

	render() {
		let {terms, selectedTerm, permissions} = this.props;
		if (terms == null) return <div>Loading terms...</div>;
		let userID = GetUserID();
		let {selectedTerm_newData, selectedTerm_newDataError} = this.state;

		let creatorOrMod = selectedTerm != null && IsUserCreatorOrMod(userID, selectedTerm);
		
		return (
			<Row plr={7} style={{height: "100%", alignItems: "flex-start"}}>
				<Column mtb={10} style={{
					//position: "relative", flex: .4, height: "calc(100% - 20px)",
					position: "absolute", left: 10, right: "40%", height: "calc(100% - 20px)", // fix for safari
					background: "rgba(0,0,0,.5)", borderRadius: 10
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
					<ScrollView style={{flex: 1}} contentStyle={{flex: 1, padding: 10}} onClick={e=> {
						if (e.target != e.currentTarget) return;
						store.dispatch(new ACTTermSelect({id: null}));
					}}>
						{terms.map((term, index)=> {
							return <TermUI key={index} first={index == 0} term={term} selected={selectedTerm == term}/>;
						})}
					</ScrollView>
				</Column>
				<ScrollView style={{
					//marginLeft: 10,
					//flex: .6,
					position: "absolute", left: "60%", right: 0, height: "100%", // fix for safari
				}} contentStyle={{flex: 1, padding: 10}}>
					<Column style={{position: "relative", background: "rgba(0,0,0,.5)", borderRadius: 10}}>
						<Row style={{height: 40, justifyContent: "center", background: "rgba(0,0,0,.7)", borderRadius: "10px 10px 0 0"}}>
							{selectedTerm &&
								<Div style={{fontSize: 17, fontWeight: 500}}>
									{GetFullNameP(selectedTerm)}
								</Div>}
							<Div p={7} style={{position: "absolute", right: 0}}>
								{creatorOrMod &&
									<Button ml="auto" text="Save details" enabled={selectedTerm_newData != null && selectedTerm_newDataError == null} onClick={async e=> {
										let updates = RemoveHelpers(selectedTerm_newData.Including("name", "disambiguation", "type", "person", "shortDescription_current"));
										await new UpdateTermData({termID: selectedTerm._id, updates}).Run();
										//this.SetState({selectedTerm_newData: null});
									}}/>}
								{creatorOrMod &&
									<Button text="Delete term" ml={10} enabled={selectedTerm != null} onClick={async e=> {
										ShowMessageBox({
											title: `Delete "${GetFullNameP(selectedTerm)}"`, cancelButton: true,
											message: `Delete the term "${GetFullNameP(selectedTerm)}"?`,
											onOK: async ()=> {
												await new DeleteTerm({termID: selectedTerm._id}).Run();
											}
										});
									}}/>}
							</Div>
						</Row>
						{selectedTerm
							? <TermDetailsUI baseData={selectedTerm} forNew={false} enabled={creatorOrMod} style={{padding: 10}}
									onChange={(data, error)=>this.SetState({selectedTerm_newData: data, selectedTerm_newDataError: error})}/>
							: <div style={{padding: 10}}>No term selected.</div>}
					</Column>
					<Column mt={10} style={{position: "relative", background: "rgba(0,0,0,.5)", borderRadius: 10}}>
						<Row style={{height: 40, justifyContent: "center", background: "rgba(0,0,0,.7)", borderRadius: "10px 10px 0 0"}}>
							<Div style={{/*fontSize: 17,*/ fontWeight: 500}}>
								{/*Components*/}
								{selectedTerm ? GetHelperTextForTermType(selectedTerm) : null}
							</Div>
							<Div p={7} style={{position: "absolute", right: 0}}>
								{creatorOrMod &&
									<Button ml="auto" text="Add component" enabled={selectedTerm != null} onClick={async e=> {
										//if (userID == null) return ShowSignInPopup();
										ShowAddTermComponentDialog(userID, selectedTerm._id);
									}}/>}
							</Div>
						</Row>
						{/*<Pre style={{textAlign: "center"}}>{GetHelperTextForTermType(selectedTerm)}</Pre>*/}
						{selectedTerm == null && <div style={{padding: 10}}>No term selected.</div>}
						{selectedTerm && <TermComponentsUI term={selectedTerm} editing={true} style={{marginTop: 10, padding: 10}}/>}
					</Column>
				</ScrollView>
			</Row>
		);
	}
}

function GetHelperTextForTermType(term: Term) {
	let fullName = GetFullNameP(term);
	if (term.type == TermType.SpecificEntity) return `"${fullName}" (consistent with the description above) is ${term.person ? "someone who" : "something which"}...`;
	if (term.type == TermType.EntityType) return `A${fullName.toLowerCase().StartsWithAny(..."aeiou".split("")) ? "n" : ""} "${fullName
		}" (consistent with the description above) is ${term.person ? "someone who" : "something which"}...`;
	if (term.type == TermType.Adjective) return `If something is "${fullName}" (consistent with the description above), it is...`;
	if (term.type == TermType.Action) return `To "${fullName}" (consistent with the description above) is to...`;
	if (term.type == TermType.Adverb) return `If an action is performed "${fullName}" (consistent with the description above), it is done...`;
	Assert(false);
}

type TermUI_Props = {term: Term, first: boolean, selected: boolean} & Partial<{variantNumber: number}>;
@Connect((state, props: TermUI_Props)=>({
	variantNumber: GetTermVariantNumber(props.term),
}))
export class TermUI extends BaseComponent<TermUI_Props, {}> {
	render() {
		let {term, first, selected, variantNumber} = this.props;
		return (
			<Row mt={first ? 0 : 5} className="cursorSet"
					style={E(
						{padding: 5, background: "rgba(100,100,100,.5)", borderRadius: 5, cursor: "pointer"},
						selected && {background: "rgba(100,100,100,.7)"},
					)}
					onClick={e=> {
						store.dispatch(new ACTTermSelect({id: term._id}));
					}}>
				<Pre>{GetFullNameP(term)}<sup>{variantNumber}</sup>: </Pre>
				{term.shortDescription_current}
				<Span ml="auto">
					<Pre style={{opacity: .7}}>({GetNiceNameForTermType(term.type)}) </Pre>
					<Pre>#{term._id}</Pre>
				</Span>
			</Row>
		);
	}
}

export function GetNiceNameForTermType(type: TermType) {
	if (type == TermType.Action) return "action/process";
	return TermType[type].replace(/.([A-Z])/g, m=>m[0] + " " + m[1]).toLowerCase();
}