import {gql} from "@apollo/client";
import {AsNodeL1Input, ChildGroup, CullNodePhrasingToBeEmbedded, GetMap, GetNode, GetNodeChildrenL2, GetNodeDisplayText, GetNodeL2, NodeL1, NodeL3, NodeLink, NodePhrasing, NodeRevision, NodeType, Polarity} from "dm_common";
import {E, ModifyString} from "js-vextensions";
import {CreateAccessor, GetAsync} from "mobx-graphlink";
import React from "react";
import {Button, CheckBox, Column, Row, Text} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";
import {ShowMessageBox} from "react-vmessagebox";
import {store} from "Store";
import {GetOpenMapID} from "Store/main.js";
import {ImportResource, IR_NodeAndRevision} from "Utils/DataFormats/DataExchangeFormat.js";
import {RunCommand_AddChildNode} from "Utils/DB/Command.js";
import {apolloClient} from "Utils/LibIntegrations/Apollo.js";
import {AddNotificationMessage, ES, Observer, RunInAction_Set} from "web-vcore";
import {CreateAncestorForResource, CreateResource, ResolveNodeIDsForInsertPath} from "./Utils.js";

@Observer
export class ImportResourceUI extends BaseComponent<
	{
		importUnderNode: NodeL3, resource: ImportResource, index: number, resources: ImportResource[],
		autoSearchByTitle: boolean,
		searchQueryGen: number, onNodeCreated: ()=>any,
	},
	{search: boolean, existingNodesWithTitle: number|n}
> {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.autoSearchByTitle != this.props.autoSearchByTitle) {
			this.SetState({search: props.autoSearchByTitle}, ()=>{
				this.ApplySearchSetting();
			});
		}
		// here, we only rerun the search (based on search-query-generation), if we haven't found a matching node yet
		else if (props.searchQueryGen != this.props.searchQueryGen && (this.state.existingNodesWithTitle ?? 0) == 0) {
			this.ApplySearchSetting();
		}
	}
	async ApplySearchSetting() {
		const res = this.props.resource;
		if (this.state.search && res instanceof IR_NodeAndRevision && res.CanSearchByTitle()) {
			// todo: update this to work against new rust backend! (atm this query fails, hence ui option for it disabled)
			const result = await apolloClient.query({
				query: gql`
					query SearchQueryForImport($title: String!) {
						nodeRevisions(filter: {phrasing: {contains: {text_base: $title}}}) {
							nodes { id }
						}
					}
				`,
				variables: {title: res.revision.phrasing.text_base},
				fetchPolicy: "network-only",
			});
			const foundNodeIDs = result.data.nodeRevisions.nodes.map(a=>a.id);
			this.SetState({existingNodesWithTitle: foundNodeIDs.length});
		} else {
			this.SetState({existingNodesWithTitle: null});
		}
	}

	render() {
		const {importUnderNode, resource: res, index, resources, onNodeCreated} = this.props;
		const {search, existingNodesWithTitle} = this.state;
		const uiState = store.main.maps.importSubtreeDialog;
		const pathStr = res.pathInData.join("."); //+ (resource.path.length > 0 ? "." : "");

		const map = GetMap(GetOpenMapID());

		const insertPath = res instanceof IR_NodeAndRevision && res.insertPath_titles ? res.insertPath_titles : [];
		const insertPath_resolvedNodeIDs = ResolveNodeIDsForInsertPath(importUnderNode.id, insertPath);
		const parentNodeID = insertPath.length > 0 ? insertPath_resolvedNodeIDs.LastOrX() : importUnderNode.id;
		const ownNodeTextResolved = parentNodeID != null && res instanceof IR_NodeAndRevision && res.ownTitle != null
			// use CatchBail, so that after each node-add, it doesn't cause the rows to switch to "Loading..." (which causes loss of the scroll-position)
			? ResolveNodeIDsForInsertPath.CatchBail([null], parentNodeID, [res.ownTitle]).Last() != null
			: false;

		return (
			<Column mt={index == 0 ? 0 : 5} pr={5} sel style={{border: "solid gray", borderWidth: index == 0 ? 0 : "1px 0 0 0"}}>
				<Row>
					{res instanceof IR_NodeAndRevision &&
					<>
						<Text style={{flexShrink: 0, fontWeight: "bold", padding: "0 3px", background: "rgba(128,128,128,.5)", marginBottom: -5}}>{pathStr}</Text>
						<Row ml={5} mr={5} style={{flex: 1, display: "block"}}>
							<Text mr={3} style={{display: "inline-block", flexShrink: 0, fontWeight: "bold"}}>
								{ModifyString(res.node.type, m=>[m.startLower_to_upper])}
								{res.node.type == NodeType.argument && res.link.polarity != null &&
									<Text style={{display: "inline-block", flexShrink: 0, fontWeight: "bold"}}> [{res.link.polarity == Polarity.supporting ? "pro" : "con"}]</Text>}
								{":"}
							</Text>
							<Column>
								<Row>{res.revision.phrasing.text_base}</Row>
								{(res.revision.phrasing.text_question ?? "").length > 0 && <Row>{`<question form> ${res.revision.phrasing.text_question}`}</Row>}
								{(res.revision.phrasing.text_narrative ?? "").length > 0 && <Row>{`<narrative form> ${res.revision.phrasing.text_narrative}`}</Row>}
							</Column>
						</Row>
					</>}
					<Column>
						{res instanceof IR_NodeAndRevision && res.CanSearchByTitle() &&
							<CheckBox ml={5} text={`Search: ${existingNodesWithTitle ?? "?"}`}
								style={ES(
									{flex: 1},
									existingNodesWithTitle == 0 && {background: "rgba(0,255,0,.5)"},
									existingNodesWithTitle != null && existingNodesWithTitle > 0 && {background: "rgba(255,0,0,.5)"},
								)}

								// temp-disabled, till backend supports the search feature
								enabled={false}
								title="This feature is currently disabled, until the backend is updated to support title-based node[-revision] searching."

								value={search} onChange={async val=>{
									this.SetState({search: val}, ()=>{
										this.ApplySearchSetting();
									});
								}}/>}
						<CheckBox ml={5} text="Selected"
							style={E(
								{flexShrink: 0},
								uiState.selectedImportResources.has(res) && {background: "rgba(255,0,255,.5)"},
							)}
							value={uiState.selectedImportResources.has(res)}
							onChange={(val, e)=>{
								const ev = e.nativeEvent as MouseEvent;
								RunInAction_Set(this, ()=>{
									const newSelected = val;
									let startI = index;
									let lastI = index;
									// select range, if holding down ctrl-key (on windows), command-key (on mac), or shift-key (on either -- though must click *exactly* on the checkbox, not the label)
									if (ev.ctrlKey || ev.metaKey || ev.shiftKey) {
										if (uiState.selectFromIndex != -1) {
											startI = Math.min(uiState.selectFromIndex, index);
											lastI = Math.max(uiState.selectFromIndex, index);
										}
									} else {
										uiState.selectFromIndex = index;
									}

									for (let i = startI; i <= lastI; i++) {
										if (newSelected) {
											uiState.selectedImportResources.add(resources[i]);
										} else {
											uiState.selectedImportResources.delete(resources[i]);
										}
									}
								});
							}}/>
					</Column>
				</Row>
				{uiState.showAutoInsertTools &&
				<Row sel style={{background: "rgba(0,0,0,.3)", padding: 3}}>
					<Text>Path:</Text>
					{insertPath.map((segment, segmentIndex)=>{
						const prevResolvedNodeID = segmentIndex == 0 ? importUnderNode.id : insertPath_resolvedNodeIDs[segmentIndex - 1];
						const prevResolvedNode = GetNodeL2(prevResolvedNodeID);
						const resolvedNodeID = insertPath_resolvedNodeIDs[segmentIndex];
						return (
							<Row center key={segmentIndex}
								style={E(
									{marginLeft: 5, padding: "0 3px", borderRadius: 5, cursor: "pointer"},
									!resolvedNodeID && {background: "rgba(255,0,0,.5)"},
									resolvedNodeID && {background: "rgba(0,255,0,.5)"},
								)}
								onClick={()=>{
									if (prevResolvedNodeID && !resolvedNodeID && res instanceof IR_NodeAndRevision) {
										ShowMessageBox({
											cancelButton: true,
											title: "Create this category node?",
											message: `
												Parent:${prevResolvedNode ? GetNodeDisplayText(prevResolvedNode, null, map) : "n/a"} (id: ${prevResolvedNodeID})
												NewNode:${segment}
											`.AsMultiline(0),
											onOK: async()=>{
												const success = await CreateAncestorForResource(res, map?.id, prevResolvedNodeID, segment, res.node.accessPolicy);
												if (success) {
													//await command.RunOnServer();
													onNodeCreated();
												} else {
													AddNotificationMessage(`Could not create ancestor "${segment}".`);
												}
											},
										});
									}
								}}
							>
								{segment}
							</Row>
						);
					})}
					<Row ml="auto">
						{res instanceof IR_NodeAndRevision &&
						<>
							<Button text={ownNodeTextResolved ? "Create (again)" : "Create"} p="0 10px" enabled={insertPath_resolvedNodeIDs.length == 0 || insertPath_resolvedNodeIDs.LastOrX() != null}
								style={E(
									ownNodeTextResolved && {backgroundColor: "rgba(0,255,0,.5)"},
								)}
								onClick={async()=>{
									await CreateResource(res, map?.id, insertPath_resolvedNodeIDs.LastOrX() ?? importUnderNode.id);
									onNodeCreated();
								}}/>
						</>}
					</Row>
				</Row>}
			</Column>
		);
	}
}