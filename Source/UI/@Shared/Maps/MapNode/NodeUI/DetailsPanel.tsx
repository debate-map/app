import {MapNode, ThesisForm, MapNodeEnhanced} from "../../../../../Store/firebase/nodes/@MapNode";
import {PermissionGroupSet} from "../../../../../Store/firebase/userExtras/@UserExtraInfo";
import {MapNodeType} from "../../../../../Store/firebase/nodes/@MapNodeType";
import {GetEntries} from "../../../../../Frame/General/Enums";
import {RootState} from "../../../../../Store";
import {GetUserID, GetUserPermissionGroups, GetUserMap, GetUser, User} from "../../../../../Store/firebase/users";
import Button from "../../../../../Frame/ReactComponents/Button";
import * as jquery from "jquery";
import {Log} from "../../../../../Frame/General/Logging";
import {BaseComponent, FindDOM, Pre, RenderSource, SimpleShouldUpdate, FindDOM_, Div, GetInnerComp} from "../../../../../Frame/UI/ReactGlobals";
import {Vector2i} from "../../../../../Frame/General/VectorStructs";
import {Range, DN} from "../../../../../Frame/General/Globals";
import Spinner from "../../../../../Frame/ReactComponents/Spinner";
import {connect} from "react-redux";
import Select from "../../../../../Frame/ReactComponents/Select";
import {ShowMessageBox_Base, ShowMessageBox} from "../../../../../Frame/UI/VMessageBox";
import {firebaseConnect} from "react-redux-firebase";
import {WaitXThenRun} from "../../../../../Frame/General/Timers";
import TextInput from "../../../../../Frame/ReactComponents/TextInput";
import * as Moment from "moment";
import {GetParentNode, GetParentNodeID} from "../../../../../Store/firebase/nodes";
import {Connect} from "../../../../../Frame/Database/FirebaseConnect";
import {IsUserCreatorOrMod} from "../../../../../Store/firebase/userExtras";
import {E} from "../../../../../Frame/General/Globals_Free";
import Row from "../../../../../Frame/ReactComponents/Row";
import {MetaThesis_ThenType, MetaThesis_ThenType_Info, MetaThesis_IfType, GetMetaThesisIfTypeDisplayText} from "../../../../../Store/firebase/nodes/@MetaThesisInfo";
import QuoteInfoEditorUI from "../QuoteInfoEditorUI";
import UpdateNodeDetails from "../../../../../Server/Commands/UpdateNodeDetails";
import {RemoveHelpers} from "../../../../../Frame/Database/DatabaseHelpers";
import {HandleError} from "../../../../../Frame/General/Errors";
import {ContentNode} from "../../../../../Store/firebase/contentNodes/@ContentNode";
import CheckBox from "../../../../../Frame/ReactComponents/CheckBox";
import InfoButton from "../../../../../Frame/ReactComponents/InfoButton";
import {GetNodeForm, GetLinkUnderParent, GetNodeEnhanced} from "../../../../../Store/firebase/nodes/$node";
import Column from "../../../../../Frame/ReactComponents/Column";
import NodeDetailsUI from "../NodeDetailsUI";
import {SlicePath} from "./RatingsPanel";
import {AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Brush, Legend,
	ReferenceArea, ReferenceLine, ReferenceDot, ResponsiveContainer, CartesianAxis} from "recharts";

type DetailsPanel_Props = {node: MapNodeEnhanced, path: string} & Partial<{creator: User}>;
@Connect((state, {node, path}: DetailsPanel_Props)=>({
	_: GetUserPermissionGroups(GetUserID()),
	_link: GetLinkUnderParent(node._id, GetParentNode(path)),
	creator: GetUser(node.creator),
}))
//export default class DetailsPanel extends BaseComponent<DetailsPanel_Props, {error: Error}> {
export default class DetailsPanel extends BaseComponent<DetailsPanel_Props, {dataError: string}> {
	detailsUI: NodeDetailsUI;
	render() {
		let {node, path, creator} = this.props;
		let {dataError} = this.state;
		let firebase = store.firebase.helpers;
		//let {error} = this.state;

		var parentNode = GetNodeEnhanced(GetParentNode(path), SlicePath(path, 1));
		let link = GetLinkUnderParent(node._id, parentNode);

		let creatorOrMod = IsUserCreatorOrMod(GetUserID(), node);

		return (
			<Column style={{position: "relative"}}>
				<NodeDetailsUI ref={c=>this.detailsUI = GetInnerComp(c) as any} baseData={node} baseLinkData={link} parent={parentNode}
					creating={false} editing={creatorOrMod}
					onChange={(newData, newLinkData)=> {
						this.SetState({dataError: this.detailsUI.GetValidationError()});
					}}/>
				{creatorOrMod &&
					<Row>
						<Button text="Save" enabled={dataError == null} onLeftClick={async ()=> {
							let nodeUpdates = GetUpdates(node, this.detailsUI.GetNewData()).Excluding("parents", "children", "finalType", "link");
							let linkUpdates = GetUpdates(link, this.detailsUI.GetNewLinkData());
							await new UpdateNodeDetails({nodeID: node._id, nodeUpdates, linkParentID: GetParentNodeID(path), linkUpdates}).Run();
						}}/>
						{/*error && <Pre>{error.message}</Pre>*/}
					</Row>}
			</Column>
		);
	}
}

function GetUpdates(oldData, newData, useNullInsteadOfUndefined = true) {
	let result = {};
	for (let key of oldData.VKeys(true).concat(newData.VKeys(true))) {
		if (newData[key] !== oldData[key]) {
			result[key] = newData[key];
			if (newData[key] === undefined && useNullInsteadOfUndefined) {
				result[key] = null;
			}
		}
	}
	return RemoveHelpers(result);
}