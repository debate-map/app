import Moment from "web-vcore/nm/moment";
import {Button, Column, Row, TextArea} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentWithConnector, BaseComponentPlus, cssHelper} from "web-vcore/nm/react-vextensions.js";
import {BoxController, ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {UUIDStub} from "UI/@Shared/UUIDStub.js";
import {ES, Observer} from "web-vcore";
import {E} from "web-vcore/nm/js-vextensions.js";
import {Map, NodeL3, GetUser, NodeRevision, GetParentNodeL3, GetLinkUnderParent, GetNodeRevisions, IsUserCreatorOrAdmin, HasAdminPermissions, MeID} from "dm_common";

import {liveSkin} from "Utils/Styles/SkinManager.js";
import {RunCommand_DeleteNodePhrasing, RunCommand_DeleteNodeRevision} from "Utils/DB/Command.js";
import {GetMaxSafeDialogContentHeight, TextArea_Div} from "Utils/ReactComponents/TextArea_Div.js";
import {NodeDetailsUI} from "../../NodeDetailsUI.js";

export const columnWidths = [0.15, 0.3, 0.35, 0.2];

@Observer
export class HistoryPanel extends BaseComponentPlus({} as {show: boolean, map?: Map|n, node: NodeL3, path: string}, {}) {
	detailsUI: NodeDetailsUI;
	render() {
		const {show, map, node, path} = this.props;
		// let mapID = map ? map._id : null;

		// _link: GetLinkUnderParent(node._id, GetParentNode(path)),
		const creator = GetUser(node.creator);
		let revisions = GetNodeRevisions(node.id);
		// we want the newest ones listed first
		revisions = revisions.OrderByDescending(a=>a.createdAt);

		// const creatorOrMod = IsUserCreatorOrMod(MeID(), node);
		const {css} = cssHelper(this);
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
					//background: liveSkin.BasePanelBackgroundColor().alpha(1).css(),
					background: "transparent",
				})}>
					{revisions.map((revision, index)=>{
						return <RevisionEntryUI key={revision.id} index={index} last={index == revisions.length - 1} revision={revision} node={node} path={path} map={map}/>;
					})}
				</ScrollView>
			</Column>
		);
	}
}

type RevisionEntryUI_Props = {index: number, last: boolean, revision: NodeRevision, node: NodeL3, path: string, map: Map|n};
@Observer
class RevisionEntryUI extends BaseComponentPlus({} as RevisionEntryUI_Props, {}) {
	render() {
		const {index, last, revision, node, path, map} = this.props;
		const parent = GetParentNodeL3(path);
		const link = GetLinkUnderParent(node.id, parent);
		const creator = GetUser(revision.creator);

		return (
			<Row p="4px 7px" style={E(
				{background: index % 2 == 0
					//? liveSkin.ListEntryBackgroundColor_Light().css()
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
						const boxController = ShowMessageBox({
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
						const boxController = ShowMessageBox({
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
	}
}