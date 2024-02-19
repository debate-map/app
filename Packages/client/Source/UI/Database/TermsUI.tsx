import {CanGetBasicPermissions, DeleteTerm, GetFullNameP, GetTerms, GetUserPermissionGroups, IsUserCreatorOrMod, MeID, Term, TermType, UpdateTerm} from "dm_common";
import {useEffect} from "react";
import {store} from "Store";
import {GetSelectedTerm, GetSelectedTermID} from "Store/main/database";
import {ES, GetUpdates, Observer, RunInAction, chroma_maxDarken} from "web-vcore";
import {Assert, E} from "web-vcore/nm/js-vextensions.js";
import {runInAction} from "web-vcore/nm/mobx.js";
import {Button, Column, Div, Pre, Row, Span, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, UseEffect} from "web-vcore/nm/react-vextensions.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {liveSkin} from "Utils/Styles/SkinManager";
import {RunCommand_DeleteTerm, RunCommand_UpdateTerm} from "Utils/DB/Command.js";
import {ShowSignInPopup} from "../@Shared/NavBar/UserPanel.js";
import {ShowAddTermDialog, TermDetailsUI} from "./Terms/TermDetailsUI.js";

@Observer
export class TermsUI extends BaseComponentPlus({} as {}, {} as {selectedTerm_newData: Term|n, selectedTerm_newDataError: string|n}) {
	render() {
		const {selectedTerm_newData, selectedTerm_newDataError} = this.state;

		const userID = MeID();
		const terms = GetTerms();
		const selectedTerm = GetSelectedTerm();
		const permissions = GetUserPermissionGroups(userID);
		const creatorOrMod = selectedTerm != null && IsUserCreatorOrMod(userID, selectedTerm);

		// whenever selectedTerm changes, reset the derivative states (there's probably a better way to do this, but I don't know how yet)
		useEffect(()=>{
			this.SetState({selectedTerm_newData: null, selectedTerm_newDataError: null});
		}, [selectedTerm]);

		if (terms == null) return <div>Loading terms...</div>;
		return (
			<Row plr={7} style={{height: "100%", alignItems: "flex-start"}}>
				<Column mtb={10} style={{
					// position: "relative", flex: .4, height: "calc(100% - 20px)",
					position: "absolute", left: 10, right: "40%", height: "calc(100% - 20px)", // fix for safari
					background: liveSkin.BasePanelBackgroundColor().css(), borderRadius: 10,
				}}>
					<Row center style={{height: 40, justifyContent: "center", background: liveSkin.HeaderColor().css(), borderRadius: "10px 10px 0 0"}}>
						<Div p={7} style={{position: "absolute", left: 0}}>
							<Button text="Add term" enabled={CanGetBasicPermissions(MeID())} onClick={e=>{
								if (userID == null) return ShowSignInPopup();
								ShowAddTermDialog();
							}}/>
						</Div>
						<Div style={{fontSize: 17, fontWeight: 500}}>
							Terms
						</Div>
					</Row>
					<ScrollView style={ES({flex: 1})} contentStyle={ES({flex: 1, padding: 10})} onClick={(e: React.MouseEvent)=>{
						//if (e.target != e.currentTarget) return;
						if ((e.target as HTMLElement|n)?.parentElement != e.currentTarget) return; // temp; till react-vscrollview updated to accept "content_onClick" prop
						RunInAction("TermsUI.ScrollView.onClick", ()=>store.main.database.selectedTermID = null);
					}}>
						{terms.map((term, index)=><TermUI key={index} first={index == 0} term={term} selected={GetSelectedTermID() == term.id}/>)}
					</ScrollView>
				</Column>
				<ScrollView style={{
					// marginLeft: 10,
					// flex: .6,
					position: "absolute", left: "60%", right: 0, height: "100%", // fix for safari
				}} contentStyle={ES({flex: 1, padding: 10})}>
					<Column style={{position: "relative", background: liveSkin.BasePanelBackgroundColor().css(), borderRadius: 10}}>
						<Row style={{height: 40, justifyContent: "center", background: liveSkin.HeaderColor().css(), borderRadius: "10px 10px 0 0"}}>
							{selectedTerm &&
								<Text style={{fontSize: 17, fontWeight: 500}}>
									{GetFullNameP(selectedTerm)}
								</Text>}
							<Div p={7} style={{position: "absolute", right: 0}}>
								{creatorOrMod &&
									<Button ml="auto" text="Save details" enabled={selectedTerm_newData != null && selectedTerm_newDataError == null}
										onClick={async e=>{
											Assert(selectedTerm); // nn: button would be disabled otherwise
											const updates = GetUpdates(selectedTerm, selectedTerm_newData);
											//await new UpdateTerm({id: selectedTerm.id, updates}).RunOnServer();
											await RunCommand_UpdateTerm({id: selectedTerm.id, updates});
											// this.SetState({selectedTerm_newData: null});
										}}/>}
								{creatorOrMod &&
									<Button text="Delete term" ml={10} enabled={selectedTerm != null}
										onClick={async e=>{
											Assert(selectedTerm); // nn: button would be disabled otherwise
											ShowMessageBox({
												title: `Delete "${GetFullNameP(selectedTerm)}"`, cancelButton: true,
												message: `Delete the term "${GetFullNameP(selectedTerm)}"?`,
												onOK: async()=>{
													//await new DeleteTerm({id: selectedTerm.id}).RunOnServer();
													await RunCommand_DeleteTerm({id: selectedTerm.id});
												},
											});
										}}/>}
							</Div>
						</Row>
						{selectedTerm
							? <TermDetailsUI baseData={selectedTerm} phase={creatorOrMod ? "edit" : "view"} style={{padding: 10}}
								onChange={(data, error)=>this.SetState({selectedTerm_newData: data, selectedTerm_newDataError: error})}/>
							: <div style={{padding: 10}}>No term selected.</div>}
					</Column>
				</ScrollView>
			</Row>
		);
	}
}

export class TermUI extends BaseComponentPlus({} as {term: Term, first: boolean, selected: boolean}, {}) {
	render() {
		const {term, first, selected} = this.props;
		return (
			<Row mt={first ? 0 : 5} className="cursorSet"
				style={E(
					{padding: 5, background: liveSkin.BasePanelBackgroundColor().darken(.05 * chroma_maxDarken).css(), borderRadius: 5, cursor: "pointer"},
					selected && {background: liveSkin.BasePanelBackgroundColor().darken(.1 * chroma_maxDarken).css()},
				)}
				onClick={e=>{
					RunInAction("TermUI.onClick", ()=>store.main.database.selectedTermID = term.id);
				}}>
				<div>
					<span style={{fontWeight: "bold"}}>{GetFullNameP(term)}<sup>{term.id.substr(0, 2)}</sup>: </span>
					<span>{term.definition}</span>
				</div>
				<Span ml="auto">
					<Pre style={{opacity: 0.7}}>({GetNiceNameForTermType(term.type)}) </Pre>
					<Pre>#{term.id.slice(0, 4)}</Pre>
				</Span>
			</Row>
		);
	}
}

export function GetNiceNameForTermType(type: TermType) {
	//if (type == TermType.Verb) return "action/process";
	return TermType[type].replace(/.([A-Z])/g, m=>`${m[0]} ${m[1]}`).toLowerCase();
}