import {MapNode} from "../../../../../Store/firebase/nodes/@MapNode";
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
import * as Moment from "moment";
import {GetParentNode} from "../../../../../Store/firebase/nodes";
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
import {AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Brush, Legend,
	ReferenceArea, ReferenceLine, ReferenceDot, ResponsiveContainer, CartesianAxis} from "recharts";

type DetailsPanel_Props = {node: MapNode, path: string, userID: string} & Partial<{nodeCreator: User}>;
@Connect((state: RootState, {node}: DetailsPanel_Props)=> {
	return {
		_: GetUserPermissionGroups(GetUserID()),
		nodeCreator: GetUser(node.creator),
	};
})
//export default class DetailsPanel extends BaseComponent<DetailsPanel_Props, {error: Error}> {
export default class DetailsPanel extends BaseComponent<DetailsPanel_Props, {contentNodeError: string}> {
	quoteEditor: QuoteInfoEditorUI;
	relative: CheckBox;
	render() {
		let {node, path, userID, nodeCreator} = this.props;
		let {contentNodeError} = this.state;
		let firebase = store.firebase.helpers;
		//let {error} = this.state;

		if (node.metaThesis) {
			var parentNode = GetParentNode(path);
			var thenTypes = parentNode.type == MapNodeType.SupportingArgument
				? GetEntries(MetaThesis_ThenType, name=>MetaThesis_ThenType_Info.for[name].displayText).Take(2)
				: GetEntries(MetaThesis_ThenType, name=>MetaThesis_ThenType_Info.for[name].displayText).Skip(2);
		}

		return (
			<div className="selectable" style={{position: `relative`, padding: `5px`}}>
				<Div style={{fontSize: 12}}>NodeID: {node._id}</Div>
				<Div mt={3} style={{fontSize: 12}}>Created at: {(Moment as any)(node.createdAt).format(`YYYY-MM-DD HH:mm:ss`)} (by: {nodeCreator ? nodeCreator.displayName : `n/a`})</Div>
				{IsUserCreatorOrMod(userID, node) &&
					<Div mt={3}>
						{node.type == MapNodeType.Thesis && !node.contentNode && !node.metaThesis &&
							<Row style={{display: "flex", alignItems: "center"}}>
								<Pre>Relative: </Pre>
								<CheckBox ref={c=>this.relative = c} internalChanging={true} checked={node.relative}/>
								<InfoButton text={`"Relative" means the statement/question is too loosely worded to give a simple yes/no answer,${""
										} and should instead be evaluated in terms of the degree/intensity to which it is true. Eg. "How dangerous is sky-diving?"`}/>
							</Row>}
						{!node.contentNode && !node.metaThesis &&
							<Row style={{display: `flex`, alignItems: `center`}}>
								<Pre>Title (base): </Pre>
								<TextInput ref="title_base" style={{flex: 1}} delayChangeTillDefocus={true} value={node.titles[`base`]}/>
							</Row>}
						{node.type == MapNodeType.Thesis && !node.metaThesis && (
							node.contentNode ? [
								<QuoteInfoEditorUI key={0} ref={c=>this.quoteEditor = c} contentNode={node.contentNode} showPreview={false} justShowed={false}
									onSetError={error=>this.SetState({contentNodeError: error})}/>
							] : [
								<Row key={0} mt={5} style={{display: `flex`, alignItems: `center`}}>
									<Pre>Title (negation): </Pre>
									<TextInput ref="title_negation" style={{flex: 1}} delayChangeTillDefocus={true} value={node.titles[`negation`]}/>
								</Row>,
								<Row key={1} mt={5} style={{display: `flex`, alignItems: `center`}}>
									<Pre>Title (yes-no question): </Pre>
									<TextInput ref="title_yesNoQuestion" style={{flex: 1}} delayChangeTillDefocus={true} value={node.titles[`yesNoQuestion`]}/>
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
						<Row>
							<Button text="Save" enabled={contentNodeError == null} mt={10} onLeftClick={async ()=> {
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

								let updates = RemoveHelpers(E(
									this.relative &&
										{relative: this.relative.Checked},
									(this.refs.title_base || this.refs.title_negation || this.refs.title_yesNoQuestion) &&
										{titles: E(
											this.refs.title_base && {base: this.refs.title_base.GetValue()},
											this.refs.title_negation && {negation: this.refs.title_negation.GetValue()},
											this.refs.title_yesNoQuestion && {yesNoQuestion: this.refs.title_yesNoQuestion.GetValue()},
										)},
									this.quoteEditor &&
										{contentNode: this.quoteEditor.GetUpdatedContentNode()},
								));
								//try {
								await new UpdateNodeDetails({nodeID: node._id, updates}).Run();
								/*} catch (ex) {
									//this.SetState({error: ex});
									HandleError(ex);
								}*/
							}}/>
						{/*error && <Pre>{error.message}</Pre>*/}
					</Row>
				</Div>}
			</div>
		);
	}
}