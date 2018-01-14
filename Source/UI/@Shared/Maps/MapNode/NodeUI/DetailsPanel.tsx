import {MapNode, ClaimForm, MapNodeL2, MapNodeL3} from "../../../../../Store/firebase/nodes/@MapNode";
import {PermissionGroupSet} from "../../../../../Store/firebase/userExtras/@UserExtraInfo";
import {MapNodeType} from "../../../../../Store/firebase/nodes/@MapNodeType";
import {GetEntries} from "../../../../../Frame/General/Enums";
import {RootState} from "../../../../../Store";
import {GetUserID, GetUserPermissionGroups, GetUser, User} from "../../../../../Store/firebase/users";
import {Button} from "react-vcomponents";
import jquery from "jquery";
import {Log} from "../../../../../Frame/General/Logging";
import {BaseComponent, FindDOM, RenderSource, SimpleShouldUpdate, GetInnerComp} from "react-vextensions";
import {Pre} from "react-vcomponents";
import {Vector2i} from "js-vextensions";
import {Range, DN} from "js-vextensions";
import {Spinner} from "react-vcomponents";
import {connect} from "react-redux";
import {Select} from "react-vcomponents";
import {ShowMessageBox_Base, ShowMessageBox} from "react-vmessagebox";
import {firebaseConnect} from "react-redux-firebase";
import {WaitXThenRun} from "js-vextensions";
import {TextInput} from "react-vcomponents";
import Moment from "moment";
import {GetParentNode, GetParentNodeID, IsNodeSubnode, GetParentNodeL3} from "../../../../../Store/firebase/nodes";
import {Connect} from "../../../../../Frame/Database/FirebaseConnect";
import {IsUserCreatorOrMod} from "../../../../../Store/firebase/userExtras";
import {Row} from "react-vcomponents";
import {ImpactPremise_ThenType, ImpactPremise_IfType, GetImpactPremiseIfTypeDisplayText} from "./../../../../../Store/firebase/nodes/@ImpactPremiseInfo";
import QuoteInfoEditorUI from "../QuoteInfoEditorUI";
import UpdateNodeDetails from "../../../../../Server/Commands/UpdateNodeDetails";
import {RemoveHelpers, SlicePath, GetUpdates, WaitTillPathDataIsReceived, DBPath, WaitTillPathDataIsReceiving} from "../../../../../Frame/Database/DatabaseHelpers";
import {HandleError} from "../../../../../Frame/General/Errors";
import {ContentNode} from "../../../../../Store/firebase/contentNodes/@ContentNode";
import {CheckBox} from "react-vcomponents";
import InfoButton from "../../../../../Frame/ReactComponents/InfoButton";
import {GetNodeForm, GetLinkUnderParent, GetNodeL3} from "../../../../../Store/firebase/nodes/$node";
import {Column} from "react-vcomponents";
import NodeDetailsUI from "../NodeDetailsUI";
import {Map} from "../../../../../Store/firebase/maps/@Map";
import AddNodeRevision from "../../../../../Server/Commands/AddNodeRevision";
import UpdateLink from "../../../../../Server/Commands/UpdateLink";
import {ACTSetLastAcknowledgementTime} from "Store/main";
import {AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Brush, Legend,
	ReferenceArea, ReferenceLine, ReferenceDot, ResponsiveContainer, CartesianAxis} from "recharts";
import { SetNodeUILocked } from "UI/@Shared/Maps/MapNode/NodeUI";

type DetailsPanel_Props = {map?: Map, node: MapNodeL3, path: string} & Partial<{creator: User}>;
@Connect((state, {node, path}: DetailsPanel_Props)=>({
	_: GetUserPermissionGroups(GetUserID()),
	_link: GetLinkUnderParent(node._id, GetParentNode(path)),
	creator: GetUser(node.creator),
}))
//export default class DetailsPanel extends BaseComponent<DetailsPanel_Props, {error: Error}> {
export default class DetailsPanel extends BaseComponent<DetailsPanel_Props, {dataError: string}> {
	detailsUI: NodeDetailsUI;
	render() {
		let {map, node, path, creator} = this.props;
		let mapID = map ? map._id : null;
		let {dataError} = this.state;

		let isSubnode = IsNodeSubnode(node);

		var parentNode = GetParentNodeL3(path);
		// if parent-node not loaded yet, don't render yet
		if (!isSubnode && path.includes("/") && parentNode == null) return null;
		
		let link = GetLinkUnderParent(node._id, parentNode);

		let creatorOrMod = IsUserCreatorOrMod(GetUserID(), node);

		return (
			<Column style={{position: "relative"}}>
				<NodeDetailsUI ref={c=>this.detailsUI = GetInnerComp(c) as any}
					baseData={node} baseRevisionData={node.current} baseLinkData={link} parent={parentNode}
					forNew={false} enabled={creatorOrMod}
					onChange={(newData, newLinkData)=> {
						this.SetState({dataError: this.detailsUI.GetValidationError()});
					}}/>
				{creatorOrMod &&
					<Row>
						<Button text="Save" enabled={dataError == null} onLeftClick={async ()=> {
							//let nodeUpdates = GetUpdates(node, this.detailsUI.GetNewData()).Excluding("parents", "children", "layerPlusAnchorParents", "finalType", "link");
							if (link) {
								let linkUpdates = GetUpdates(link, this.detailsUI.GetNewLinkData());
								if (linkUpdates.VKeys(true).length) {
									await new UpdateLink(E({linkParentID: GetParentNodeID(path), linkChildID: node._id, linkUpdates})).Run();
								}
							}

							SetNodeUILocked(parentNode._id, true);
							try {
								var revisionID = await new AddNodeRevision({mapID: map._id, revision: RemoveHelpers(this.detailsUI.GetNewRevisionData())}).Run();
								store.dispatch(new ACTSetLastAcknowledgementTime({nodeID: node._id, time: Date.now()}));
								await WaitTillPathDataIsReceiving(DBPath(`nodeRevisions/${revisionID}`));
								await WaitTillPathDataIsReceived(DBPath(`nodeRevisions/${revisionID}`));
							} finally {
								SetNodeUILocked(parentNode._id, false);
							}
						}}/>
						{/*error && <Pre>{error.message}</Pre>*/}
					</Row>}
			</Column>
		);
	}
}