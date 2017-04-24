import {MapNode, IsNodeTitleValid_GetError} from "../../../../../Store/firebase/nodes/@MapNode";
import {PermissionGroupSet} from "../../../../../Store/firebase/userExtras/@UserExtraInfo";
import {MapNodeType} from "../../../../../Store/firebase/nodes/@MapNodeType";
import {GetEntries} from "../../../../../Frame/General/Enums";
import {RootState} from "../../../../../Store";
import {GetUserID, GetUserPermissionGroups, GetUserMap, GetUser, User} from "../../../../../Store/firebase/users";
import {Type} from "../../../../../Frame/General/Types";
import Button from "../../../../../Frame/ReactComponents/Button";
import * as jquery from "jquery";
import {Log} from "../../../../../Frame/General/Logging";
import {BaseComponent, FindDOM, Pre, RenderSource, SimpleShouldUpdate, FindDOM_, Div} from "../../../../../Frame/UI/ReactGlobals";
import {Vector2i} from "../../../../../Frame/General/VectorStructs";
import {Range, DN} from "../../../../../Frame/General/Globals";
import Spinner from "../../../../../Frame/ReactComponents/Spinner";
import {connect} from "react-redux";
import Select from "../../../../../Frame/ReactComponents/Select";
import {ShowMessageBox_Base, ShowMessageBox} from "../../../../../Frame/UI/VMessageBox";
import {firebaseConnect} from "react-redux-firebase";
import {WaitXThenRun} from "../../../../../Frame/General/Timers";
import TextInput from "../../../../../Frame/ReactComponents/TextInput";
import Moment from "moment";
import {GetParentNode} from "../../../../../Store/firebase/nodes";
import {Connect} from "../../../../../Frame/Database/FirebaseConnect";
import {IsUserCreatorOrMod} from "../../../../../Store/firebase/userExtras";
import {QuoteInfoEditorUI} from "../NodeUI_Menu/AddChildDialog";
import {E} from "../../../../../Frame/General/Globals_Free";
import Row from "../../../../../Frame/ReactComponents/Row";
import {MetaThesis_ThenType, MetaThesis_ThenType_Info, MetaThesis_IfType, GetMetaThesisIfTypeDisplayText} from "../../../../../Store/firebase/nodes/@MetaThesisInfo";
import {AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Brush, Legend,
	ReferenceArea, ReferenceLine, ReferenceDot, ResponsiveContainer, CartesianAxis} from "recharts";

type OthersPanel_Props = {node: MapNode, path: string, userID: string} & Partial<{nodeCreator: User}>;
@Connect((state: RootState, {node}: OthersPanel_Props)=> {
	return {
		_: GetUserPermissionGroups(GetUserID()),
		nodeCreator: GetUser(node.creator),
	};
})
export default class OthersPanel extends BaseComponent<OthersPanel_Props, {}> {
	render() {
		let {node, path, userID, nodeCreator} = this.props;
		let firebase = store.firebase.helpers;
		if (node.metaThesis) {
			var parentNode = GetParentNode(path);
			var thenTypes = parentNode.type == MapNodeType.SupportingArgument
				? GetEntries(MetaThesis_ThenType, name=>MetaThesis_ThenType_Info.for[name].displayText).Take(2)
				: GetEntries(MetaThesis_ThenType, name=>MetaThesis_ThenType_Info.for[name].displayText).Skip(2);
		}

		return (
			<div className="selectable" style={{position: "relative", padding: "5px"}}>
				<Div style={{fontSize: 12}}>NodeID: {node._id}</Div>
				<Div mt={3} style={{fontSize: 12}}>Created at: {Moment(node.createdAt).format("YYYY-MM-DD HH:mm:ss")} (by: {nodeCreator ? nodeCreator.displayName : "n/a"})</Div>
				{IsUserCreatorOrMod(userID, node) &&
					<Div mt={3}>
						{!node.quote && !node.metaThesis &&
							<Row style={{display: "flex", alignItems: "center"}}>
								<Pre>Title (base): </Pre>
								<TextInput ref="title_base" style={{flex: 1}} delayChangeTillDefocus={true} value={node.titles["base"]}/>
							</Row>}
						{node.type == MapNodeType.Thesis && !node.metaThesis && (
							node.quote ? [
								<QuoteInfoEditorUI key={0} ref="quoteEditor" info={node.quote.Extended({})} showPreview={false} justShowed={false}/>
							] : [
								<Row key={0} mt={5} style={{display: "flex", alignItems: "center"}}>
									<Pre>Title (negation): </Pre>
									<TextInput ref="title_negation" style={{flex: 1}} delayChangeTillDefocus={true} value={node.titles["negation"]}/>
								</Row>,
								<Row key={1} mt={5} style={{display: "flex", alignItems: "center"}}>
									<Pre>Title (yes-no question): </Pre>
									<TextInput ref="title_yesNoQuestion" style={{flex: 1}} delayChangeTillDefocus={true} value={node.titles["yesNoQuestion"]}/>
								</Row>
							]
						)}
						{node.metaThesis &&
							<Row mt={5}>
								<Pre>Type: If </Pre>
								<Select options={GetEntries(MetaThesis_IfType, name=>GetMetaThesisIfTypeDisplayText(MetaThesis_IfType[name]))}
									value={node.metaThesis.ifType} onChange={val=> {
										firebase.Ref(`nodes/${node._id}/metaThesis`).update({ifType: val});
									}}/>
								<Pre> premises below are true, they </Pre>
								<Select options={thenTypes} value={node.metaThesis.thenType} onChange={val=> {
									firebase.Ref(`nodes/${node._id}/metaThesis`).update({thenType: val});
								}}/>
								<Pre>.</Pre>
							</Row>}
						<Button text="Save" mt={10} onLeftClick={()=> {
							/*firebase.Ref().update(E(
								this.refs.title_base && {base: this.refs.title_base.GetValue()},
								this.refs.title_negation && {negation: this.refs.title_negation.GetValue()},
								this.refs.yesNoQuestion && {yesNoQuestion: this.refs.title_yesNoQuestion.GetValue()},
							));*/
							firebase.Ref(`nodes/${node._id}`).transaction(node=> {
								if (!node) return node;

								// todo: move these higher-up, and have errors shown in ui
								/*if (this.refs.title_base) {
									let error = IsNodeTitleValid_GetError(node, this.refs.title_base.GetValue());
									if (error) return void ShowMessageBox({title: "Cannot set title", message: error});
									node.titles.base = this.refs.title_base.GetValue();
								}*/

								if (this.refs.title_base) node.titles.base = this.refs.title_base.GetValue();
								if (this.refs.title_negation) node.titles.negation = this.refs.title_negation.GetValue();
								if (this.refs.title_yesNoQuestion) node.titles.yesNoQuestion = this.refs.title_yesNoQuestion.GetValue();

								if (this.refs.quoteEditor) node.quote = this.refs.quoteEditor.props.info;

								return node;
							}, undefined, false);
						}}/>
					</Div>}
			</div>
		);
	}

	SaveInfo() {

	}
}