import {GetUserHidden, Me, MeID, SetUserData_Hidden, GetCommandRuns, CommandRun, GetUser, AddChildNode, NodeType, GetNode, GetNodeL2, GetNodeL3, AddNodeRevision, GetNodeRevision, AsNodeL3, AsNodeL2, GetAccessPolicy, CommandRun_commandNameValues, NodeL3, GetMap, globalMapID} from "dm_common";
import React from "react";
import {store} from "Store";
import {NodeBox} from "UI/@Shared/Maps/Node/NodeBox";
import useResizeObserver from "use-resize-observer";
import {RunCommand_UpdateUserHidden} from "Utils/DB/Command";
import {HSLA, InfoButton, Link, Observer, RunInAction_Set, TextPlus} from "web-vcore";
import {Assert, ModifyString} from "web-vcore/nm/js-vextensions";
import {Command, RunInAction} from "web-vcore/nm/mobx-graphlink";
import moment from "web-vcore/nm/moment";
import {Button, CheckBox, Column, Pre, Row, Text} from "web-vcore/nm/react-vcomponents";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox";
import {ScrollView} from "web-vcore/nm/react-vscrollview";
import {GetOpenMapID} from "../../Store/main.js";

@Observer
export class StreamUI extends BaseComponentPlus({panel: false} as {panel?: boolean}, {}) {
	render() {
		const {panel} = this.props;
		const userHidden = GetUserHidden(MeID());
		const commandRuns = GetCommandRuns(CommandRun_commandNameValues.map(a=>a), undefined, store.main.social.showAll).OrderByDescending(a=>a.runTime);

		const entryLimit = 30; // for now, only show the last 30 command-runs (need a paging system or the like)
		return (
			<Column style={{height: "100%"}}>
				<Row center mb={5}>
					<Text>Recent changes:</Text>
					<CheckBox ml="auto" text="Add to stream" enabled={userHidden != null} value={userHidden?.addToStream ?? false} onChange={val=>{
						//new SetUserData_Hidden({id: MeID()!, updates: {addToStream: val}}).RunOnServer();
						RunCommand_UpdateUserHidden({id: MeID()!, updates: {addToStream: val}});
					}}/>
					<InfoButton ml={5} text="When enabled, contributions you make to maps and such will be shown on the Social page and Stream panel. (to users not excluded from the relevant access-policies)"/>
					{Me()?.permissionGroups.admin && <>
						<CheckBox ml={10} text="Show all" value={store.main.social.showAll} onChange={val=>RunInAction_Set(this, ()=>store.main.social.showAll = val)}/>
						<InfoButton ml={5} text="When enabled, private contributions are also shown in the UI. (admin-only option)"/>
					</>}
				</Row>
				<ScrollView>
					{commandRuns.Take(entryLimit).map((run, index)=>{
						return <CommandRunUI key={index} run={run} index={index} last={index == commandRuns.length - 1} panel={panel ?? false}/>;
					})}
				</ScrollView>
			</Column>
		);
	}
}

/*const commandTypesToShow = [
	AddChildNode,
	AddNodeRevision,
] as Array<new(..._)=>Command<any>>;*/

@Observer
class CommandRunUI extends BaseComponentPlus({} as {run: CommandRun, index: number, last: boolean, panel: boolean}, {}) {
	render() {
		const {run, index, last, panel} = this.props;
		const actor = GetUser(run.actor);
		const actorLink = (
			<Link className="selectable" text={actor == null ? "[unknown user]" : actor.displayName} style={{textAlign: "center"}} actionFunc={s=>{
				if (actor != null) {
					s.main.page = "database";
					s.main.database.subpage = "users";
					s.main.database.selectedUserID = actor.id;
				}
			}}/>
		);

		const {ref: rootRef, width = -1, height = -1} = useResizeObserver();

		let messageUI: JSX.Element;
		let messageUI_row2: JSX.Element|n;
		let node_final:NodeL3|n;
		if (run.commandName == "addChildNode") {
			const payload = run.commandInput as (typeof AddChildNode)["prototype"]["payload"];
			const returnData = run.commandResult as (typeof AddChildNode)["prototype"]["returnData"];
			const parent = GetNode(payload.parentID);

			//const node = GetNodeL2(returnData.nodeID);
			//const node = GetNodeL3(returnData.nodeID);
			const node = GetNode(returnData.nodeID);
			const revision = GetNodeRevision(returnData.revisionID);
			const accessPolicy = GetAccessPolicy(node?.accessPolicy);
			if (node != null && revision != null && accessPolicy) {
				const nodeL2 = AsNodeL2(node, revision, accessPolicy);
				node_final = AsNodeL3(nodeL2, null);

				messageUI = <>
					<Row center p={5}>
						{actorLink}
						<Text sel ml={5}>added {payload.node.type} #{returnData.nodeID} under {parent?.type} #{payload.parentID}.</Text>
					</Row>
				</>;
				messageUI_row2 = <>
					{node && // check if node and such exists (node may have been deleted after creation)
						<NodeBox indexInNodeList={0} node={node_final} path={node.id} treePath="0" forLayoutHelper={false}
							backgroundFillPercentOverride={100} width={width}
							useLocalPanelState={true} usePortalForDetailBoxes={true} panelsPosition={panel ? "below" : "left"}/>}
				</>;
			}
		} else if (run.commandName == "addNodeRevision") {
			const payload = run.commandInput as (typeof AddNodeRevision)["prototype"]["payload"];
			const returnData = run.commandResult as (typeof AddNodeRevision)["prototype"]["returnData"];
			const revision = GetNodeRevision(returnData.id);
			const node = GetNode(payload.revision.node);
			const accessPolicy = GetAccessPolicy(node?.accessPolicy);
			if (revision != null && node != null && accessPolicy) {
				const nodeL2 = AsNodeL2(node, revision, accessPolicy);
				node_final = AsNodeL3(nodeL2, null);
				messageUI = <>
					<Row center p={5}>
						{actorLink}
						<Text sel ml={5}>added a revision for {node.type} #{node.id}.</Text>
					</Row>
				</>;
				messageUI_row2 = <>
					{node && // check if node and such exists (node may have been deleted after creation)
						<NodeBox indexInNodeList={0} node={node_final} path={node.id} treePath="0" forLayoutHelper={false}
							backgroundFillPercentOverride={100} width={width}
							useLocalPanelState={true} usePortalForDetailBoxes={true} panelsPosition={panel ? "below" : "left"}/>}
				</>;
			}
		} else {
			Assert(false, "Server returned command-runs that did not match the types requested.");
		}

		const openMapID = GetOpenMapID();
		const openMap = GetMap(openMapID);
		const map = GetMap(node_final!.rootNodeForMap);
		const inCurrentMap = openMap?.id === map?.id;

		console.log("nodeFinal:", node_final);

		return (
			<Column ref={a=>rootRef(a?.DOM_HTML ?? null)}>
				<Row mt={index > 0 ? 10 : 0} mb={run.commandName == "addChildNode" ? 30 : 0} style={{background: HSLA(0, 0, 1, .2), borderRadius: 5, fontSize: 13}}>
					<Column sel ml={5} mr={5} p={5} center style={{justifyContent: "center"}}>
						<Pre>{moment(run.runTime).format("YYYY-MM-DD")}</Pre>
						<Pre>{moment(run.runTime).format("HH:mm:ss")}</Pre>
					</Column>
					{messageUI!}
					<Button ml="auto" text={inCurrentMap ? "Find in Map" : "Go to Map"} style={{flexShrink: 0}} onClick={()=>{
						if (inCurrentMap) {
							// const path = 
							// JumpToNode(openMapID!, resultPath);
						} else {
							if (map == null) return; // still loading
							RunInAction("SearchResultRow.OpenContainingMap", ()=>{
								if (map.id == globalMapID) {
									store.main.page = "global";
								} else {
									store.main.page = "debates";
									store.main.debates.selectedMapID = map.id;
								}
							});
						}

					}}/>
					<Button ml={5} text="Details" style={{flexShrink: 0}} onClick={()=>{
						ShowMessageBox({
							title: "Command-run details (JSON)",
							message: ()=>{
								return (
									<Row sel style={{background: HSLA(0, 0, 1, .2), borderRadius: 5, whiteSpace: "pre-wrap"}}>
										{JSON.stringify(run, null, 2)}
									</Row>
								);
							},
						});
					}}/>
				</Row>
				{messageUI_row2}
			</Column>
		);
	}
}