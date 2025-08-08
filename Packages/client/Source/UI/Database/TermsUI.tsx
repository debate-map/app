import {CanGetBasicPermissions, GetFullNameP, GetTerms, MeID, PERMISSIONS, Term, TermType} from "dm_common";
import React, {useEffect, useState} from "react";
import {store} from "Store";
import {GetSelectedTerm, GetSelectedTermID} from "Store/main/database";
import {ES, GetUpdates, RunInAction, chroma_maxDarken} from "web-vcore";
import {Assert, E} from "js-vextensions";
import {Button, Column, Div, Pre, Row, Span, Text} from "react-vcomponents";
import {ShowMessageBox} from "react-vmessagebox";
import {ScrollView} from "react-vscrollview";
import {liveSkin} from "Utils/Styles/SkinManager";
import {RunCommand_DeleteTerm, RunCommand_UpdateTerm} from "Utils/DB/Command.js";
import {ShowSignInPopup} from "../@Shared/NavBar/UserPanel.js";
import {ShowAddTermDialog, TermDetailsUI} from "./Terms/TermDetailsUI.js";
import {observer_mgl} from "mobx-graphlink";

export const TermsUI = observer_mgl(()=>{
	const [selectedTerm_newData, setSelectedTermNewData] = useState<Term|n>(null);
	const [selectedTerm_newDataError, setSelectedTermNewDataError] = useState<string|n>(null);

	const userID = MeID();
	const terms = GetTerms();
	const selectedTerm = GetSelectedTerm();

	const permissionsModify = selectedTerm != null && PERMISSIONS.Term.Modify(userID, selectedTerm);
	const permissionsDelete = selectedTerm != null && PERMISSIONS.Term.Delete(userID, selectedTerm);

	// whenever selectedTerm changes, reset the derivative states (there's probably a better way to do this, but I don't know how yet)
	useEffect(()=>{
		setSelectedTermNewData(null);
		setSelectedTermNewDataError(null);
	}, [selectedTerm])

	if (terms == null) return <div>Loading terms...</div>;
	return (
		<Row plr={7} style={{height: "100%", alignItems: "flex-start"}}>
			<Column mtb={10} style={{
			     position: "absolute", left: 10, right: "40%", height: "calc(100% - 20px)",
			     background: liveSkin.BasePanelBackgroundColor().css(), borderRadius: 10,
			}}>
				<Row center style={{height: 40, justifyContent: "center", background: liveSkin.HeaderColor().css(), borderRadius: "10px 10px 0 0"}}>
					<div style={{padding: 7, position: "absolute", left: 0}}>
						<Button text="Add term" enabled={CanGetBasicPermissions(MeID())} onClick={()=>{
							if (userID == null) return ShowSignInPopup();
							ShowAddTermDialog();
						}}/>
					</div>
					<div style={{fontSize: 17, fontWeight: 500}}>
						Terms
					</div>
				</Row>
				<ScrollView style={ES({flex: 1})} contentStyle={ES({flex: 1, padding: 10})} onClick={(e: React.MouseEvent)=>{
					if ((e.target as HTMLElement|n)?.parentElement != e.currentTarget) return; // temp; till react-vscrollview updated to accept "content_onClick" prop
					RunInAction("TermsUI.ScrollView.onClick", ()=>store.main.database.selectedTermID = null);
				}}>
					{terms.map((term, index)=><TermUI key={index} first={index == 0} term={term} selected={GetSelectedTermID() == term.id}/>)}
				</ScrollView>
			</Column>
            <ScrollView style={{
                position: "absolute", left: "60%", right: 0, height: "100%"
            }} contentStyle={ES({flex: 1, padding: 10})}>
				<Column style={{position: "relative", background: liveSkin.BasePanelBackgroundColor().css(), borderRadius: 10}}>
					<Row style={{height: 40, justifyContent: "center", background: liveSkin.HeaderColor().css(), borderRadius: "10px 10px 0 0"}}>
						{selectedTerm && <Text style={{fontSize: 17, fontWeight: 500}}>{GetFullNameP(selectedTerm)}</Text>}
						<Div p={7} style={{position: "absolute", right: 0}}>
							{permissionsModify &&
								<Button ml="auto" text="Save details" enabled={selectedTerm_newData != null && selectedTerm_newDataError == null}
									onClick={async()=>{
										Assert(selectedTerm); // nn: button would be disabled otherwise
										const updates = GetUpdates(selectedTerm, selectedTerm_newData);
										//await new UpdateTerm({id: selectedTerm.id, updates}).RunOnServer();
										await RunCommand_UpdateTerm({id: selectedTerm.id, updates});
										// this.SetState({selectedTerm_newData: null});
									}}/>}
							{permissionsDelete &&
								<Button text="Delete term" ml={10} enabled={selectedTerm != null}
									onClick={async()=>{
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
						? <TermDetailsUI baseData={selectedTerm} phase={permissionsModify ? "edit" : "view"} style={{padding: 10}}
							onChange={(data, error)=>{
								setSelectedTermNewData(data);
								setSelectedTermNewDataError(error);
							}}/>
						: <div style={{padding: 10}}>No term selected.</div>}
				</Column>
			</ScrollView>
		</Row>
	)
})

export const TermUI = (({term, first, selected}:{term: Term, first: boolean, selected: boolean})=>{
	return (
		<Row mt={first ? 0 : 5} className="cursorSet"
			style={E(
				{padding: 5, background: liveSkin.BasePanelBackgroundColor().darken(.05 * chroma_maxDarken).css(), borderRadius: 5, cursor: "pointer"},
				selected && {background: liveSkin.BasePanelBackgroundColor().darken(.1 * chroma_maxDarken).css()},
			)}
			onClick={()=>{
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
})

export function GetNiceNameForTermType(type: TermType) {
	return TermType[type].replace(/.([A-Z])/g, m=>`${m[0]} ${m[1]}`).toLowerCase();
}
