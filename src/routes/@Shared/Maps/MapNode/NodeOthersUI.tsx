import Button from "../../../../Frame/ReactComponents/Button";
import * as jquery from "jquery";
import {Log} from "../../../../Frame/General/Logging";
import {BaseComponent, FindDOM, Pre, RenderSource, SimpleShouldUpdate, FindDOM_, Div} from "../../../../Frame/UI/ReactGlobals";
import {Vector2i} from "../../../../Frame/General/VectorStructs";
import {Range, DN} from "../../../../Frame/General/Globals";
import Spinner from "../../../../Frame/ReactComponents/Spinner";
import {connect} from "react-redux";
import Select from "../../../../Frame/ReactComponents/Select";
import {ShowMessageBox_Base, ShowMessageBox} from "../../../../Frame/UI/VMessageBox";
import {firebaseConnect} from "react-redux-firebase";
import {MapNode, MetaThesis_IfType, MetaThesis_ThenType, MetaThesis_ThenType_Info} from "../MapNode";
import {GetData} from "../../../../Frame/Database/DatabaseHelpers";
import {RatingType, RatingType_Info} from "./RatingType";
import {MapNodeType_Info, MapNodeType} from "../MapNodeType";
import {ACTRatingUISmoothnessSet, GetRatingUISmoothing} from "../../../../store/Root/Main";
import {GetUserID, Rating, GetUserPermissionGroups, GetNode, GetParentNode} from "../../../../store/Root/Firebase";
import {RootState} from "../../../../store/Root";
import {CreatorOrMod} from "./NodeUI_Menu";
import {WaitXThenRun} from "../../../../Frame/General/Timers";
import TextInput from "../../../../Frame/ReactComponents/TextInput";
import {PermissionGroupSet} from "../../Users/UserExtraInfo";
import {GetEntries} from "../../../../Frame/General/Enums";
import Moment from "moment";
import {AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Brush, Legend,
	ReferenceArea, ReferenceLine, ReferenceDot, ResponsiveContainer, CartesianAxis} from "recharts";

type NodeOthersUI_Props = {node: MapNode, path: string, userID: string} & Partial<{permissionGroups: PermissionGroupSet}>;
@firebaseConnect()
@(connect((state: RootState, props: NodeOthersUI_Props)=> {
	return {
		permissionGroups: GetUserPermissionGroups(GetUserID()),
	};
}) as any)
export default class NodeOthersUI extends BaseComponent<NodeOthersUI_Props, {}> {
	render() {
		let {node, path, userID, permissionGroups, firebase} = this.props;
		if (node.metaThesis) {
			var parentNode = GetParentNode(path);
			var thenTypes = parentNode.type == MapNodeType.SupportingArgument
				? GetEntries(MetaThesis_ThenType, name=>MetaThesis_ThenType_Info.for[name].displayText).Take(2)
				: GetEntries(MetaThesis_ThenType, name=>MetaThesis_ThenType_Info.for[name].displayText).Skip(2);
		}

		return (
			<div className="selectable" style={{position: "relative", padding: "5px"}}>
				<Div style={{fontSize: 12}}>NodeID: {node._id}</Div>
				<Div mt={3} style={{fontSize: 12}}>Created at: {Moment(node.createdAt).format("YYYY-MM-DD HH:mm:ss")}</Div>
				{CreatorOrMod(node, userID, permissionGroups) &&
					<div>
						{!node.metaThesis &&
							<div style={{display: "flex", alignItems: "center"}}>
								<Pre>Title: </Pre>
								<TextInput ref="title" style={{flex: 1}} delayChangeTillDefocus={true} value={node.title}/>
								<Button text="Save" ml={5} onLeftClick={()=> {
									firebase.Ref(`nodes/${node._id}`).update({title: this.refs.title.GetValue()});
								}}/>
							</div>}
						{node.metaThesis &&
							<div>
								<Pre>Type: If </Pre>
								<Select options={GetEntries(MetaThesis_IfType, name=>name.toLowerCase())}
									value={node.metaThesis_ifType} onChange={val=> {
										firebase.Ref(`nodes/${node._id}`).update({metaThesis_ifType: val});
									}}/>
								<Pre> premises below are true, they </Pre>
								<Select options={thenTypes} value={node.metaThesis_thenType} onChange={val=> {
									firebase.Ref(`nodes/${node._id}`).update({metaThesis_thenType: val});
								}}/>
								<Pre>.</Pre>
							</div>}
					</div>}
			</div>
		);
	}
}