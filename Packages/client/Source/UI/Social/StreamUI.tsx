import {GetUserHidden, Me, MeID, GetCommandRuns, CommandRun, GetUser, AddChildNode, GetNode, AddNodeRevision, GetNodeRevision, AsNodeL3, AsNodeL2, GetAccessPolicy, CommandRun_commandNameValues, NodeL3, GetMap} from "dm_common";
import React, {useEffect, useRef, useState} from "react";
import {store} from "Store";
import {NodeBox} from "UI/@Shared/Maps/Node/NodeBox";
import {RunCommand_UpdateUserHidden} from "Utils/DB/Command";
import {HSLA, InfoButton, Link, RunInAction_Set, useResizeObserver, AssertUnreachable} from "web-vcore";
import moment from "moment";
import {Button, CheckBox, Column, Pre, Row, Text} from "react-vcomponents";
import {ShowMessageBox} from "react-vmessagebox";
import {ScrollView} from "react-vscrollview";
import {FindPathsFromMapRootsToX, MapPathResult} from "../@Shared/NavBar/SearchPanel.js";
import {observer_mgl} from "mobx-graphlink";
import {PayloadOf, ReturnDataOf} from "mobx-graphlink"

export const StreamUI = observer_mgl((props: { panel?: boolean })=>{
	const {panel = false} = props;

	// for now, only show the last 30 command-runs (need a paging system or the like)
	const entryLimit = 30;
	const userHidden = GetUserHidden(MeID());
	const commandRuns = GetCommandRuns(
		CommandRun_commandNameValues.map(a=>a),
		undefined,
		store.main.social.showAll,
	).OrderByDescending(a=>a.runTime);

	return (
        <Column style={{height: "100%"}}>
            <Row center mb={5}>
                <Text>Recent changes:</Text>
                <CheckBox ml="auto" text="Add to stream" enabled={userHidden != null} value={userHidden?.addToStream ?? false}
                    onChange={val=>{RunCommand_UpdateUserHidden({id: MeID()!, updates:{addToStream: val}})}}
                />
                <InfoButton
                    ml={5}
                    text="When enabled, contributions you make to maps and such will be shown on the Social page and Stream panel. (to users not excluded from the relevant access-policies)"
                />
                {Me()?.permissionGroups.admin && (
                    <>
                        <CheckBox ml={10} text="Show all" value={store.main.social.showAll} onChange={val=>RunInAction_Set(()=>(store.main.social.showAll = val))}/>
                        <InfoButton ml={5} text="When enabled, private contributions are also shown in the UI. (admin-only option)" />
                    </>
                )}
            </Row>
            <ScrollView>
				{commandRuns.Take(entryLimit).map((run, index)=>(
					<CommandRunUI key={index} run={run} index={index} last={index == commandRuns.length - 1} panel={panel}/>
				))}
            </ScrollView>
        </Column>
	);
});

export type CommandRunUIProps = {
	run: CommandRun,
	index: number,
	last: boolean,
	panel: boolean
};

export const CommandRunUI = observer_mgl(({run, index, panel}: CommandRunUIProps)=>{
	const actor = GetUser(run.actor);
	const {ref: rootRef, width = -1} = useResizeObserver();

	const [findingPath, setFindingPath] = useState(false);
	const [paths, setPaths] = useState<string[]>([]);

	// lifecycle guard for async path-finding
	const isMounted = useRef(true);
	useEffect(()=>{
	    isMounted.current = true;
	    return ()=>{
	        isMounted.current = false;
	    };
	}, []);

	const actorLink = (
        <Link
            className="selectable"
            text={actor == null ? "[unknown user]" : actor.displayName}
            style={{textAlign: "center"}}
            actionFunc={s=>{
				if (actor) {
				    s.main.page = "database";
				    s.main.database.subpage = "users";
				    s.main.database.selectedUserID = actor.id;
				}
            }}
        />
    );

	let messageUI: React.JSX.Element|n;
	let messageUI_row2: React.JSX.Element|n;
	let nodeFinal: NodeL3|n = null;
	let mapId: string|n;

	if (run.commandName === "addChildNode") {
		const payload = run.commandInput as PayloadOf<InstanceType<typeof AddChildNode>>;
		const returnData = run.commandResult as ReturnDataOf<InstanceType<typeof AddChildNode>>;
		const parent = GetNode(payload.parentID);
		mapId = payload.mapID;
		const node = GetNode(returnData.nodeID);
		const revision = GetNodeRevision(returnData.revisionID);
		const accessPolicy = GetAccessPolicy(node?.accessPolicy);

		if (node != null && revision != null && accessPolicy) {
			const nodeL2 = AsNodeL2(node, revision, accessPolicy);
			nodeFinal = AsNodeL3(nodeL2, null);
			messageUI = <>
				<Row center p={5}>
					{actorLink}
					<Text sel ml={5}>added {payload.node.type} #{returnData.nodeID} under {parent?.type} #{payload.parentID}.</Text>
				</Row>
			</>;

			// check if node and such exists (node may have been deleted after creation)
			messageUI_row2 = <>
                	    {node && (
                	        <NodeBox
                	            indexInNodeList={0}
                	            node={nodeFinal}
                	            path={node.id}
                	            treePath="0"
                	            forLayoutHelper={false}
                	            backgroundFillPercentOverride={100}
                	            width={width}
                	            useLocalPanelState={true}
                	            usePortalForDetailBoxes={true}
                	            panelsPosition={panel ? "below" : "left"}
                	        />
                	    )}
				</>;
		}
	} else if (run.commandName === "addNodeRevision") {
		const payload = run.commandInput as PayloadOf<InstanceType<typeof AddNodeRevision>>;;
		const returnData = run.commandResult as ReturnDataOf<InstanceType<typeof AddNodeRevision>>;
		const revision = GetNodeRevision(returnData.id);
		const node = GetNode(payload.revision.node);
		const accessPolicy = GetAccessPolicy(node?.accessPolicy);
		mapId = payload.mapID;

		if (revision != null && node != null && accessPolicy) {
			const nodeL2 = AsNodeL2(node, revision, accessPolicy);
			nodeFinal = AsNodeL3(nodeL2, null);

			messageUI = <>
				<Row center p={5}>
					{actorLink}
					<Text sel ml={5}>added a revision for {node.type} #{node.id}.</Text>
				</Row>
			</>;
			 messageUI_row2 = <>
				{node && (
				    <NodeBox
				        indexInNodeList={0}
				        node={nodeFinal}
				        path={node.id}
				        treePath="0"
				        forLayoutHelper={false}
				        backgroundFillPercentOverride={100}
				        width={width}
				        useLocalPanelState={true}
				        usePortalForDetailBoxes={true}
				        panelsPosition={panel ? "below" : "left"}
				    />
				)}
			</>;
		}
	} else {
		AssertUnreachable(run.commandName, "Server returned command-runs that did not match the types requested.");
	}

	const map = GetMap(mapId);
	const buttonText = ()=>{
		if (paths.length) return "Clear";

		if (findingPath) {
			return "Finding path...";
		}
		return "Find";

	};

	const onFindClick = ()=>{
		if (paths.length) {
			setPaths([]);
			return;
		}

		setFindingPath(true);
		FindPathsFromMapRootsToX(nodeFinal!.id, async(upPathAttempts, upPathCompletions, depth)=>{
			// if we have no more up-path-attempts to follow, or comp gets unmounted, start stopping search
			if (upPathAttempts.length == 0 || !isMounted.current) return {breakIteration: true};

			// if search is marked as "starting to stop", actually stop search here by breaking the loop
			// commented atm; this can never actually happen, since the `findingPath` is a closure-held variable (this is fine though, since there is no "stop search" button in this panel atm anyway)
			//if (!findingPath) return {breakIteration: true};
			return {breakIteration: false};
		}).then(info=>{ if (isMounted.current) setPaths(info.upPathCompletions) })
			.finally(()=>{ if (isMounted.current) setFindingPath(false) });
	};

	return (
		<Column ref={a=>rootRef(a?.root ?? null)}>
			<Row mt={index > 0 ? 10 : 0} style={{background: HSLA(0, 0, 1, .2), borderRadius: 5, fontSize: 13}}>
				<Column sel ml={5} mr={5} p={5} center style={{justifyContent: "center"}}>
					<Pre>{moment(run.runTime).format("YYYY-MM-DD")}</Pre>
					<Pre>{moment(run.runTime).format("HH:mm:ss")}</Pre>
				</Column>
				{messageUI!}
				{map?.id && <Button ml="auto" text={buttonText()} style={{flexShrink: 0}} onClick={onFindClick} />}
				<Button ml={map?.id ? 5 : "auto"} text="Details" style={{flexShrink: 0}} onClick={()=>{
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
				}} />
			</Row>
			{paths.length != 0 && (
				<Row style={{display: "flex", flexDirection: "column", gap: 4, marginTop: 4, marginBottom: 4}}>
					{paths.map(resultPath=>( <MapPathResult key={resultPath} path={resultPath} />))}
				</Row>
			)}
			<Row style={{marginTop: nodeFinal?.type === "claim" ? 30 : 0}}/>
			{messageUI_row2}
		</Column>
	);
});
