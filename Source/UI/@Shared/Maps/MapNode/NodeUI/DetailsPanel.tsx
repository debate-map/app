import {MapNode, ThesisForm, MapNodeWithFinalType} from "../../../../../Store/firebase/nodes/@MapNode";
import {PermissionGroupSet} from "../../../../../Store/firebase/userExtras/@UserExtraInfo";
import {MapNodeType} from "../../../../../Store/firebase/nodes/@MapNodeType";
import {GetEntries} from "../../../../../Frame/General/Enums";
import {RootState} from "../../../../../Store";
import {GetUserID, GetUserPermissionGroups, GetUserMap, GetUser, User} from "../../../../../Store/firebase/users";
import {Type} from "../../../../../Frame/General/Types";
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
import {GetThesisFormAtPath, GetLinkUnderParent, GetNodeWithFinalType} from "../../../../../Store/firebase/nodes/$node";
import Column from "../../../../../Frame/ReactComponents/Column";
import NodeDetailsUI from "../NodeDetailsUI";
import {AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Brush, Legend,
	ReferenceArea, ReferenceLine, ReferenceDot, ResponsiveContainer, CartesianAxis} from "recharts";

type DetailsPanel_Props = {node: MapNodeWithFinalType, path: string, userID: string} & Partial<{creator: User}>;
@Connect((state, {node, path}: DetailsPanel_Props)=>({
	_: GetUserPermissionGroups(GetUserID()),
	creator: GetUser(node.creator),
	_link: GetLinkUnderParent(node._id, GetParentNode(path)),
}))
//export default class DetailsPanel extends BaseComponent<DetailsPanel_Props, {error: Error}> {
export default class DetailsPanel extends BaseComponent<DetailsPanel_Props, {dataError: string}> {
	detailsUI: NodeDetailsUI;
	render() {
		let {node, path, userID, creator} = this.props;
		let {dataError} = this.state;
		let firebase = store.firebase.helpers;
		//let {error} = this.state;

		var parentNode = GetNodeWithFinalType(GetParentNode(path), path.split("/").slice(0, -1).join("/"));
		let link = GetLinkUnderParent(node._id, parentNode);

		let creatorOrMod = IsUserCreatorOrMod(userID, node);

		return (
			<div style={{position: "relative"}}>
				<NodeDetailsUI ref={c=>this.detailsUI = GetInnerComp(c) as any} baseData={node} baseLinkData={link} parent={parentNode}
					creating={false} editing={creatorOrMod}
					onChange={(newData, newLinkData)=> {
						this.SetState({dataError: this.detailsUI.GetValidationError()});
					}}/>
				{creatorOrMod &&
					<Row>
						<Button text="Save" enabled={dataError == null} mt={10} onLeftClick={async ()=> {
							/*firebase.Ref().update(E(
								this.refs.title_base && {base: this.refs.title_base.GetValue()},
								this.refs.title_negation && {negation: this.refs.title_negation.GetValue()},
								this.refs.yesNoQuestion && {yesNoQuestion: this.refs.title_yesNoQuestion.GetValue()},
							));*/
							/*firebase.Ref(`nodes/${node._id}`).transaction(node=> {
								if (!node) return node;

								// todo: move these higher-up, and have errors shown in ui
								/*if (this.refs.title_base) {
									let error = IsNodeTitleValid_GetError(node, this.refs.title_base.GetValue());
									if (error) return void ShowMessageBox({title: "Cannot set title", message: error});
									node.titles.base = this.refs.title_base.GetValue();
								}*#/

								if (this.refs.title_base) node.titles.base = this.refs.title_base.GetValue();
								if (this.refs.title_negation) node.titles.negation = this.refs.title_negation.GetValue();
								if (this.refs.title_yesNoQuestion) node.titles.yesNoQuestion = this.refs.title_yesNoQuestion.GetValue();

								if (this.refs.quoteEditor) node.quote = this.refs.quoteEditor.props.info;

								return node;
							}, undefined, false);*/

							/*let validationError = this.refs.quoteEditor && this.refs.quoteEditor.GetValidationError();
							if (validationError) {
								return void ShowMessageBox({title: `Validation error`, message: `Validation error: ${validationError}`});
							}*/

							/*let nodeUpdates = RemoveHelpers(E(
								this.detailsUI.relative &&
									{relative: this.detailsUI.relative.Checked},
								(this.refs.title_base || this.refs.title_negation || this.refs.title_yesNoQuestion) &&
									{titles: E(
										this.refs.title_base && {base: this.refs.title_base.GetValue()},
										this.refs.title_negation && {negation: this.refs.title_negation.GetValue()},
										this.refs.title_yesNoQuestion && {yesNoQuestion: this.refs.title_yesNoQuestion.GetValue()},
									)},
								this.detailsUI.quoteEditor &&
									{contentNode: this.detailsUI.quoteEditor.GetUpdatedContentNode()},
							));
							let linkUpdates = RemoveHelpers(E(
								this.detailsUI.asNegation &&
									{form: this.detailsUI.asNegation.Checked ? ThesisForm.Negation : ThesisForm.Base},
							));*/
							let nodeUpdates = GetUpdates(node, this.detailsUI.GetNewData()).Excluding("parents", "children", "finalType");
							let linkUpdates = GetUpdates(link, this.detailsUI.GetNewLinkData());
							await new UpdateNodeDetails({nodeID: node._id, nodeUpdates, linkParentID: GetParentNodeID(path), linkUpdates}).Run();
						}}/>
						{/*error && <Pre>{error.message}</Pre>*/}
					</Row>}
			</div>
		);
	}
}

function GetUpdates(oldData, newData) {
	let result = {};
	for (let key of oldData.VKeys(true).concat(newData.VKeys(true))) {
		if (newData[key] !== oldData[key])
			result[key] = newData[key];
	}
	return RemoveHelpers(result);
}