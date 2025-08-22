import Moment from "moment";
import {Button, Column, Row} from "react-vcomponents";
import {ShowMessageBox} from "react-vmessagebox";
import {ScrollView} from "react-vscrollview";
import {UUIDStub} from "UI/@Shared/UUIDStub.js";
import {css2} from "web-vcore";
import {E} from "js-vextensions";
import {DMap, NodeL3, GetUser, NodeRevision, GetParentNodeL3, GetLinkUnderParent, GetNodeRevisions, HasAdminPermissions, MeID} from "dm_common";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {observer_mgl} from "mobx-graphlink";
import React from "react";
import {NodeDetailsUI} from "../../NodeDetailsUI.js";
import {RunCommand_DeleteNodeRevision} from "Utils/DB/Command";

export const columnWidths = [0.15, 0.3, 0.35, 0.2];

type HistoryPanel_Props = {
	show: boolean,
	map?: DMap|n,
	node: NodeL3,
	path: string
};

export const HistoryPanel = observer_mgl((props: HistoryPanel_Props)=>{
	const {show, map, node, path} = props;
	const revisions = GetNodeRevisions(node.id).OrderByDescending(a=>a.createdAt);
	const css = css2;

	return (
		<Column style={{position: "relative", maxHeight: 300, display: show ? "flex" : "none"}}>
			<Column className="clickThrough" style={{background: liveSkin.HeaderColor().alpha(.3).css(), borderRadius: "10px 10px 0 0"}}>
				<Row style={{padding: "4px 7px"}}>
					<span style={{flex: columnWidths[0], fontWeight: 500, fontSize: 17}}>ID</span>
					<span style={{flex: columnWidths[1], fontWeight: 500, fontSize: 17}}>Date</span>
					<span style={{flex: columnWidths[2], fontWeight: 500, fontSize: 17}}>User</span>
					<span style={{flex: columnWidths[3], fontWeight: 500, fontSize: 17}}>Actions</span>
				</Row>
			</Column>
			<ScrollView className="selectable" style={css({flex: 1})} contentStyle={css({
				position: "relative", flex: 1, borderRadius: "0 0 10px 10px",
				background: "transparent",
			})}>
				{revisions.map((revision, index)=>{
					return <RevisionEntryUI key={revision.id} index={index} last={index == revisions.length - 1} revision={revision} node={node} path={path} map={map}/>;
				})}
			</ScrollView>
		</Column>
	);

});

type RevisionEntryUI_Props = {
	index: number,
	last: boolean,
	revision: NodeRevision,
	node: NodeL3,
	path: string,
	map: DMap|n
};

const RevisionEntryUI = observer_mgl((props: RevisionEntryUI_Props)=>{
	const {index, last, revision, node, path, map} = props;
	const parent = GetParentNodeL3(path);
	const link = GetLinkUnderParent(node.id, parent);
	const creator = GetUser(revision.creator);

	return (
		<Row p="4px 7px" style={E(
			{background: index % 2 == 0
				? "transparent"
				: liveSkin.ListEntryBackgroundColor_Dark().alpha(.3).css()},
			last && {borderRadius: "0 0 10px 10px"},
		)}>
			<span style={{flex: columnWidths[0]}}>
				<UUIDStub id={revision.id}/>
			</span>
			<span style={{flex: columnWidths[1]}}>{Moment(revision.createdAt).format("YYYY-MM-DD HH:mm:ss")}</span>
			<span style={{flex: columnWidths[2]}}>{creator ? creator.displayName : "n/a"}</span>
			<span style={{flex: columnWidths[3]}}>
				<Button text="V" title="View details" style={{margin: "-2px 0", padding: "1px 3px"}} onClick={()=>{
					ShowMessageBox({
						title: `Details for revision #${revision.id}`, cancelOnOverlayClick: true,
						message: ()=>{
							return (
								<div style={{minWidth: 500, maxWidth: 800}}>
									<NodeDetailsUI map={map} parent={parent}
										baseData={node} baseRevisionData={revision} baseLinkData={link}
										forNew={false} forOldRevision={true} enabled={false}/>
								</div>
							);
						},
					});
				}}/>
				<Button text="D" enabled={HasAdminPermissions(MeID()) && node.c_currentRevision != revision.id} title="Delete node-revision" style={{margin: "-2px 0", padding: "1px 3px"}} onClick={()=>{
					ShowMessageBox({
						title: `Delete revision #${revision.id}?`, cancelButton: true,
						message: `Delete revision #${revision.id} for node #${node.id}?`,
						onOK: async()=>{
							await RunCommand_DeleteNodeRevision({id: revision.id});
						},
					});
				}}/>
			</span>
		</Row>
	);
});
