import {MapNode, ClaimForm, MapNodeL2, MapNodeL3, ChildEntry} from "../../../../../../Store/firebase/nodes/@MapNode";
import {PermissionGroupSet} from "../../../../../../Store/firebase/userExtras/@UserExtraInfo";
import {MapNodeType} from "../../../../../../Store/firebase/nodes/@MapNodeType";
import {GetEntries} from "../../../../../../Frame/General/Enums";
import {RootState} from "../../../../../../Store";
import {GetUserID, GetUserPermissionGroups, GetUser} from "../../../../../../Store/firebase/users";
import {User} from "Store/firebase/users/@User";
import {Button} from "react-vcomponents";
import jquery from "jquery";
import {Log} from "../../../../../../Frame/General/Logging";
import {BaseComponent, FindDOM, RenderSource, SimpleShouldUpdate, GetInnerComp, BaseComponentWithConnector} from "react-vextensions";
import {Pre} from "react-vcomponents";
import {Vector2i} from "js-vextensions";
import {Range, DN} from "js-vextensions";
import {Spinner} from "react-vcomponents";
import {connect} from "react-redux";
import {Select} from "react-vcomponents";
import {ShowMessageBox_Base, ShowMessageBox, BoxController} from "react-vmessagebox";
import {firebaseConnect} from "react-redux-firebase";
import {WaitXThenRun} from "js-vextensions";
import {TextInput} from "react-vcomponents";
import Moment from "moment";
import {GetParentNode, GetParentNodeID, IsNodeSubnode, GetParentNodeL3} from "../../../../../../Store/firebase/nodes";
import {Connect} from "../../../../../../Frame/Database/FirebaseConnect";
import {IsUserCreatorOrMod} from "../../../../../../Store/firebase/userExtras";
import {Row} from "react-vcomponents";
import QuoteInfoEditorUI from "../../QuoteInfoEditorUI";
import UpdateNodeDetails from "../../../../../../Server/Commands/UpdateNodeDetails";
import {RemoveHelpers, SlicePath, GetUpdates} from "../../../../../../Frame/Database/DatabaseHelpers";
import {HandleError} from "../../../../../../Frame/General/Errors";
import {ContentNode} from "../../../../../../Store/firebase/contentNodes/@ContentNode";
import {CheckBox} from "react-vcomponents";
import InfoButton from "../../../../../../Frame/ReactComponents/InfoButton";
import {GetNodeForm, GetLinkUnderParent, GetNodeL3} from "../../../../../../Store/firebase/nodes/$node";
import {Column} from "react-vcomponents";
import NodeDetailsUI from "../../NodeDetailsUI";
import {Map} from "../../../../../../Store/firebase/maps/@Map";
import AddNodeRevision from "../../../../../../Server/Commands/AddNodeRevision";
import {ScrollView} from "react-vscrollview";
import {MapNodeRevision} from "../../../../../../Store/firebase/nodes/@MapNodeRevision";
import {AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Brush, Legend,
	ReferenceArea, ReferenceLine, ReferenceDot, ResponsiveContainer, CartesianAxis} from "recharts";
import { GetNodeRevisions } from "Store/firebase/nodeRevisions";

export const columnWidths = [.15, .3, .35, .2];

let connector = (state, {node, path}: {map?: Map, node: MapNodeL3, path: string})=> ({
	//_link: GetLinkUnderParent(node._id, GetParentNode(path)),
	creator: GetUser(node.creator),
	revisions: GetNodeRevisions(node._id),
});
@Connect(connector)
export class HistoryPanel extends BaseComponentWithConnector(connector, {}) {
	detailsUI: NodeDetailsUI;
	render() {
		let {map, node, path, creator, revisions} = this.props;
		//let mapID = map ? map._id : null;

		// we want the newest ones listed first
		revisions = revisions.OrderByDescending(a=>a._id);
		
		let creatorOrMod = IsUserCreatorOrMod(GetUserID(), node);
		return (
			<Column style={{position: "relative", maxHeight: 300}}>
				<Column className="clickThrough" style={{background: "rgba(0,0,0,.7)", borderRadius: "10px 10px 0 0"}}>
					<Row style={{padding: "4px 7px"}}>
						<span style={{flex: columnWidths[0], fontWeight: 500, fontSize: 17}}>ID</span>
						<span style={{flex: columnWidths[1], fontWeight: 500, fontSize: 17}}>Date</span>
						<span style={{flex: columnWidths[2], fontWeight: 500, fontSize: 17}}>User</span>
						<span style={{flex: columnWidths[3], fontWeight: 500, fontSize: 17}}>Actions</span>
					</Row>
				</Column>
				<ScrollView className="selectable" style={{flex: 1}} contentStyle={{flex: 1, position: "relative"}}>
					{revisions.map((revision, index)=> {
						return <RevisionEntryUI key={revision._id} index={index} last={index == revisions.length - 1} revision={revision} node={node} path={path}/>
					})}
				</ScrollView>
			</Column>
		);
	}
}

type RevisionEntryUI_Props = {index: number, last: boolean, revision: MapNodeRevision, node: MapNodeL3, path: string}
	& Partial<{creator: User, link: ChildEntry, parent: MapNodeL3}>;
@Connect((state, {revision, node, path}: RevisionEntryUI_Props)=> {
	let parent = GetParentNodeL3(path);
	return ({
		creator: GetUser(revision.creator),
		link: GetLinkUnderParent(node._id, parent),
		parent,
	});
})
class RevisionEntryUI extends BaseComponent<RevisionEntryUI_Props, {}> {
	render() {
		let {index, last, revision, node, path, creator, link, parent} = this.props;
		return (
			<Row p="4px 7px" style={E(
				{background: index % 2 == 0 ? "rgba(30,30,30,.7)" : "rgba(0,0,0,.7)"},
				last && {borderRadius: "0 0 10px 10px"}
			)}>
				<span style={{flex: columnWidths[0]}}>{revision._id}</span>
				<span style={{flex: columnWidths[1]}}>{Moment(revision.createdAt).format(`YYYY-MM-DD HH:mm:ss`)}</span>
				<span style={{flex: columnWidths[2]}}>{creator ? creator.displayName : `n/a`}</span>
				<span style={{flex: columnWidths[3]}}>
					<Button text="V" title="View details" style={{margin: "-2px 0", padding: "1px 3px"}} onClick={()=> {
						let boxController: BoxController = ShowMessageBox({
							title: "Details for revision #" + revision._id, cancelOnOverlayClick: true,
							messageUI: ()=> {
								return (
									<div style={{minWidth: 500}}>
										<NodeDetailsUI
											baseData={node} baseRevisionData={revision} baseLinkData={link} parent={parent}
											forNew={false} forOldRevision={true} enabled={false}/>
									</div>
								);
							}
						});
					}}/>
				</span>
			</Row>
		);
	}
}