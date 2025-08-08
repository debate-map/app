import {AccessPolicy, CanGetBasicPermissions, GetAccessPolicies, IsUserCreatorOrAdmin, MeID} from "dm_common";
import React, {useEffect, useState} from "react";
import {store} from "Store";
import {GetSelectedPolicy, GetSelectedPolicyID} from "Store/main/database";
import {ES, GetUpdates, RunInAction_Set, chroma_maxDarken} from "web-vcore";
import {Assert, E} from "js-vextensions";
import {Button, Column, Div, Pre, Row, Text} from "react-vcomponents";
import {ShowMessageBox} from "react-vmessagebox";
import {ScrollView} from "react-vscrollview";
import {liveSkin} from "Utils/Styles/SkinManager";
import {RunCommand_DeleteAccessPolicy, RunCommand_UpdateAccessPolicy} from "Utils/DB/Command.js";
import {ShowSignInPopup} from "../@Shared/NavBar/UserPanel.js";
import {PolicyDetailsUI, ShowAddAccessPolicyDialog} from "./Policies/PolicyDetailsUI.js";
import {observer_mgl} from "mobx-graphlink";

export const PoliciesUI = observer_mgl(()=>{
	const [selectedPolicy_newData, setSelectedPolicy_newData] = useState<AccessPolicy|n>(null);
	const [selectedPolicy_newDataError, setSelectedPolicy_newDataError] = useState<string|n>(null);

	const userID = MeID();
	const policies = GetAccessPolicies();
	const selectedPolicy = GetSelectedPolicy();
	const creatorOrAdmin = selectedPolicy != null && IsUserCreatorOrAdmin(userID, selectedPolicy);

	// whenever selectedPolicy changes, reset the derivative states (there's probably a better way to do this, but I don't know how yet)
	useEffect(()=>{
		setSelectedPolicy_newData(null);
		setSelectedPolicy_newDataError(null);
	}, [selectedPolicy]);

	const handleStateChange = (data: AccessPolicy, error: string)=>{
		setSelectedPolicy_newData(data);
		setSelectedPolicy_newDataError(error);
	};

	const handleAddPolicyClick = ()=>{
		if (userID == null) return ShowSignInPopup();
		ShowAddAccessPolicyDialog();
	};

	const handleSaveDetailsClick = async()=>{
		Assert(selectedPolicy); // nn: button would be disabled otherwise
		const updates = GetUpdates(selectedPolicy, selectedPolicy_newData);
		await RunCommand_UpdateAccessPolicy({id: selectedPolicy.id, updates});
	};

	const handleDeletePolicyClick = async()=>{
		Assert(selectedPolicy); // nn: button would be disabled otherwise
		ShowMessageBox({
			title: `Delete "${selectedPolicy.name}"`, cancelButton: true,
			message: `Delete the access-policy "${selectedPolicy.name}"?`,
			onOK: async()=>{
				await RunCommand_DeleteAccessPolicy({id: selectedPolicy.id});
			},
		});
	};

	const handlePolicyListClick = (e: React.MouseEvent<HTMLDivElement>)=>{
		if (e.target !== e.currentTarget) return;
		RunInAction_Set(()=>store.main.database.selectedPolicyID = null);
	};

	if (policies == null) return <div>Loading policies...</div>;

	return (
		<Row plr={7} style={{height: "100%", alignItems: "flex-start"}}>
			<Column mtb={10} style={{
				position: "absolute", left: 10, right: "40%", height: "calc(100% - 20px)", // fix for safari
				background: liveSkin.BasePanelBackgroundColor().css(), borderRadius: 10,
			}}>
				<Row center style={{height: 40, justifyContent: "center", background: liveSkin.HeaderColor().css(), borderRadius: "10px 10px 0 0"}}>
					<div style={{padding: 7, position: "absolute", left: 0}}>
						<Button text="Add policy" enabled={CanGetBasicPermissions(MeID())} onClick={handleAddPolicyClick}/>
					</div>
					<div style={{fontSize: 17, fontWeight: 500}}>
						Policies
					</div>
				</Row>
				<ScrollView style={ES({flex: 1})} contentStyle={ES({flex: 1, padding: 10})} onClick={handlePolicyListClick}>
					{policies.map((policy, index)=><PolicyUI key={index} first={index == 0} policy={policy} selected={GetSelectedPolicyID() == policy.id}/>)}
				</ScrollView>
			</Column>
				<ScrollView style={{
					position: "absolute", left: "60%", right: 0, height: "100%", // fix for safari
				}} contentStyle={ES({flex: 1, padding: 10})}>
					<Column style={{position: "relative", background: liveSkin.BasePanelBackgroundColor().css(), borderRadius: 10}}>
						<Row style={{height: 40, justifyContent: "center", background: liveSkin.HeaderColor().css(), borderRadius: "10px 10px 0 0"}}>
							{selectedPolicy &&
								<Text style={{fontSize: 17, fontWeight: 500}}>
									{selectedPolicy.name}
								</Text>}
							<Div p={7} style={{position: "absolute", right: 0}}>
								{creatorOrAdmin && <Button ml="auto" text="Save details" enabled={selectedPolicy_newData != null && selectedPolicy_newDataError == null} onClick={handleSaveDetailsClick}/>}
								{creatorOrAdmin && <Button text="Delete policy" ml={10} enabled={selectedPolicy != null} onClick={handleDeletePolicyClick}/>}
							</Div>
						</Row>
						{selectedPolicy
							? <PolicyDetailsUI baseData={selectedPolicy} phase={creatorOrAdmin ? "edit" : "view"} style={{padding: 10}} onChange={handleStateChange}/>
							: <div style={{padding: 10}}>No policy selected.</div>}
					</Column>
				</ScrollView>
		</Row>

	)

})

export const PolicyUI = ({policy, first, selected}:{policy: AccessPolicy, first: boolean, selected: boolean})=>{
	return (
		<Row mt={first ? 0 : 5} className="cursorSet"
			style={E(
				{padding: 5, background: liveSkin.BasePanelBackgroundColor().darken(.05 * chroma_maxDarken).css(), borderRadius: 5, cursor: "pointer"},
				selected && {background: liveSkin.BasePanelBackgroundColor().darken(.1 * chroma_maxDarken).css()},
			)}
			onClick={()=>{ RunInAction_Set(()=>store.main.database.selectedPolicyID = policy.id); }}>
			<Pre style={{flex: 40}}>{policy.name}<sup>{policy.id.substr(0, 2)}</sup>:</Pre>
			{/*<Text> Base: {ToJSON_Advanced(policy.permissions, {addSpacesAt: {betweenPropNameAndValue: true, betweenPropsOrItems: true}}).replace(/"/g, "")}</Text>*/}
			<Text style={{flex: 40}}> Base: [{
				["access", "add revisions", "vote", "delete"].filter(a=>policy.permissions[a.replace("add revisions", "addRevisions")]).join(", ")
			}]</Text>
			<Text style={{flex: 20}}> User-overrides: {Object.keys(policy.permissions_userExtends ?? {}).length}</Text>
		</Row>
	);
}
