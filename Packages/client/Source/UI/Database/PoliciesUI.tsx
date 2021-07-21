import {AccessPolicy, CanGetBasicPermissions, DeleteAccessPolicy, GetAccessPolicies, IsUserCreatorOrMod, MeID, UpdateAccessPolicy} from "dm_common";
import React from "react";
import {store} from "Store";
import {GetSelectedPolicy} from "Store/main/database";
import {ES, GetUpdates, Observer, RunInAction_Set} from "web-vcore";
import {Assert, E} from "web-vcore/nm/js-vextensions.js";
import {Button, Column, Div, Pre, Row, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, UseEffect} from "web-vcore/nm/react-vextensions.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {ShowSignInPopup} from "../@Shared/NavBar/UserPanel.js";
import {PolicyDetailsUI, ShowAddAccessPolicyDialog} from "./Policies/PolicyDetailsUI.js";

@Observer
export class PoliciesUI extends BaseComponentPlus({} as {}, {} as {selectedPolicy_newData: AccessPolicy|n, selectedPolicy_newDataError: string|n}) {
	render() {
		const {selectedPolicy_newData, selectedPolicy_newDataError} = this.state;

		const userID = MeID();
		const policies = GetAccessPolicies();
		const selectedPolicy = GetSelectedPolicy();
		const creatorOrMod = selectedPolicy != null && IsUserCreatorOrMod(userID, selectedPolicy);

		// whenever selectedPolicy changes, reset the derivative states (there's probably a better way to do this, but I don't know how yet)
		UseEffect(()=>{
			this.SetState({selectedPolicy_newData: null, selectedPolicy_newDataError: null});
		}, [selectedPolicy]);

		if (policies == null) return <div>Loading policies...</div>;
		return (
			<Row plr={7} style={{height: "100%", alignItems: "flex-start"}}>
				<Column mtb={10} style={{
					// position: "relative", flex: .4, height: "calc(100% - 20px)",
					position: "absolute", left: 10, right: "40%", height: "calc(100% - 20px)", // fix for safari
					background: "rgba(0,0,0,.5)", borderRadius: 10,
				}}>
					<Row center style={{height: 40, justifyContent: "center", background: "rgba(0,0,0,.7)", borderRadius: "10px 10px 0 0"}}>
						<Div p={7} style={{position: "absolute", left: 0}}>
							<Button text="Add policy" enabled={CanGetBasicPermissions(MeID())} onClick={e=>{
								if (userID == null) return ShowSignInPopup();
								ShowAddAccessPolicyDialog();
							}}/>
						</Div>
						<Div style={{fontSize: 17, fontWeight: 500}}>
							Policies
						</Div>
					</Row>
					<ScrollView style={ES({flex: 1})} contentStyle={ES({flex: 1, padding: 10})} onClick={e=>{
						if (e.target != e.currentTarget) return;
						RunInAction_Set(this, ()=>store.main.database.selectedPolicyID = null);
					}}>
						{policies.map((policy, index)=><PolicyUI key={index} first={index == 0} policy={policy} selected={selectedPolicy == policy}/>)}
					</ScrollView>
				</Column>
				<ScrollView style={{
					// marginLeft: 10,
					// flex: .6,
					position: "absolute", left: "60%", right: 0, height: "100%", // fix for safari
				}} contentStyle={ES({flex: 1, padding: 10})}>
					<Column style={{position: "relative", background: "rgba(0,0,0,.5)", borderRadius: 10}}>
						<Row style={{height: 40, justifyContent: "center", background: "rgba(0,0,0,.7)", borderRadius: "10px 10px 0 0"}}>
							{selectedPolicy &&
								<Text style={{fontSize: 17, fontWeight: 500}}>
									{selectedPolicy.name}
								</Text>}
							<Div p={7} style={{position: "absolute", right: 0}}>
								{creatorOrMod &&
									<Button ml="auto" text="Save details" enabled={selectedPolicy_newData != null && selectedPolicy_newDataError == null}
										onClick={async e=>{
											Assert(selectedPolicy); // nn: button would be disabled otherwise
											const updates = GetUpdates(selectedPolicy, selectedPolicy_newData);
											await new UpdateAccessPolicy({id: selectedPolicy.id, updates}).RunOnServer();
											// this.SetState({selectedPolicy_newData: null});
										}}/>}
								{creatorOrMod &&
									<Button text="Delete policy" ml={10} enabled={selectedPolicy != null}
										onClick={async e=>{
											Assert(selectedPolicy); // nn: button would be disabled otherwise
											ShowMessageBox({
												title: `Delete "${selectedPolicy.name}"`, cancelButton: true,
												message: `Delete the access-policy "${selectedPolicy.name}"?`,
												onOK: async()=>{
													await new DeleteAccessPolicy({id: selectedPolicy.id}).RunOnServer();
												},
											});
										}}/>}
							</Div>
						</Row>
						{selectedPolicy
							? <PolicyDetailsUI baseData={selectedPolicy} phase={creatorOrMod ? "edit" : "view"} style={{padding: 10}}
								onChange={(data, error)=>this.SetState({selectedPolicy_newData: data, selectedPolicy_newDataError: error})}/>
							: <div style={{padding: 10}}>No policy selected.</div>}
					</Column>
				</ScrollView>
			</Row>
		);
	}
}

export class PolicyUI extends BaseComponentPlus({} as {policy: AccessPolicy, first: boolean, selected: boolean}, {}) {
	render() {
		const {policy, first, selected} = this.props;
		return (
			<Row mt={first ? 0 : 5} className="cursorSet"
				style={E(
					{padding: 5, background: "rgba(100,100,100,.5)", borderRadius: 5, cursor: "pointer"},
					selected && {background: "rgba(100,100,100,.7)"},
				)}
				onClick={e=>{
					RunInAction_Set(this, ()=>store.main.database.selectedPolicyID = policy.id);
				}}>
				<Pre>{policy.name}<sup>{policy.id.substr(0, 2)}</sup>: </Pre>
				TODO
			</Row>
		);
	}
}