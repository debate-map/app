import {Assert} from "../../../../Frame/General/Assert";
import {BaseComponent, Pre, RenderSource, Div, FindDOM} from "../../../../Frame/UI/ReactGlobals";
import {Term, TermType, Term_nameFormat, Term_disambiguationFormat} from "../../../../Store/firebase/terms/@Term";
import Column from "../../../../Frame/ReactComponents/Column";
import Row from "../../../../Frame/ReactComponents/Row";
import TextInput from "../../../../Frame/ReactComponents/TextInput";
import * as Moment from "moment";
import {GetUser, User} from "../../../../Store/firebase/users";
import {Connect} from "../../../../Frame/Database/FirebaseConnect";
import {GetEntries} from "../../../../Frame/General/Enums";
import Select from "../../../../Frame/ReactComponents/Select";
import {RowLR} from "../../../../Frame/ReactComponents/Row";
import CheckBox from "../../../../Frame/ReactComponents/CheckBox";
import ScrollView from "react-vscrollview";
import Button from "../../../../Frame/ReactComponents/Button";
import TermComponent from "../../../../Store/firebase/termComponents/@TermComponent";
import {GetNiceNameForTermType} from "../../../../UI/Content/TermsUI";
import {GetTermVariantNumber} from "../../../../Store/firebase/terms";
import InfoButton from "../../../../Frame/ReactComponents/InfoButton";
import {MapNode, ThesisForm, ChildEntry, MapNodeEnhanced, MapNode_id} from "../../../../Store/firebase/nodes/@MapNode";
import QuoteInfoEditorUI from "./QuoteInfoEditorUI";
import {MapNodeType} from "../../../../Store/firebase/nodes/@MapNodeType";
import {MetaThesis_IfType, GetMetaThesisIfTypeDisplayText, MetaThesis_ThenType, MetaThesis_ThenType_Info} from "../../../../Store/firebase/nodes/@MetaThesisInfo";
import {GetParentNode, GetNodeChildren, GetNode} from "../../../../Store/firebase/nodes";
import {GetNodeForm, IsContextReversed, IsArgumentNode, GetNodeDisplayText} from "../../../../Store/firebase/nodes/$node";
import {ReverseThenType} from "../../../../Store/firebase/nodes/$node/$metaThesis";
import Icon from "../../../../Frame/ReactComponents/Icon";

type Props = {
	baseData: MapNodeEnhanced, baseLinkData: ChildEntry, parent: MapNodeEnhanced, creating: boolean, editing?: boolean, style?, onChange?: (newData: MapNode, newLinkData: ChildEntry)=>void,
	//onSetError: (error: string)=>void,
} & Partial<{creator: User}>;
@Connect((state, {baseData, creating}: Props)=>({
	creator: !creating && GetUser(baseData.creator),
}))
export default class NodeDetailsUI extends BaseComponent<Props, {newData: MapNode, newLinkData: ChildEntry}> {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) // if base-data changed
			this.SetState({newData: Clone(props.baseData).Excluding("finalType", "link"), newLinkData: Clone(props.baseLinkData)});
	}

	quoteEditor: QuoteInfoEditorUI;
	render() {
		let {baseData, parent, creating, editing, style, onChange, creator} = this.props;
		let {newData, newLinkData} = this.state;
		let firebase = store.firebase.helpers;
		let Change = (..._)=> {
			if (onChange)
				onChange(this.GetNewData(), this.GetNewLinkData());
			this.Update();
		};

		//var parentNode = GetParentNode(path);
		let isArgument = baseData.finalType == MapNodeType.SupportingArgument || baseData.finalType == MapNodeType.OpposingArgument;
		let reverseThenTypes = IsContextReversed(baseData, parent);
		let GetThenType_ForRender = thenType=>reverseThenTypes ? ReverseThenType(thenType) : thenType;
		let thenTypes_forRender = parent.finalType == MapNodeType.SupportingArgument
			? GetEntries(MetaThesis_ThenType, name=>MetaThesis_ThenType_Info.for[name].displayText).Take(2)
			: GetEntries(MetaThesis_ThenType, name=>MetaThesis_ThenType_Info.for[name].displayText).Skip(2);
		/*for (let entry of thenTypes_final) {
			entry.value = FinalizeThenType(entry.value);
		}*/

		let splitAt = 170, width = 600;
		return (
			<div> {/* needed so GetInnerComp() work */}
			<Column style={E({padding: 5}, style)}>
				{/*<Div style={{fontSize: 12}}>ID: {node._id}</Div>
				<Div mt={3} style={{fontSize: 12}}>Created at: {(Moment as any)(node.createdAt).format(`YYYY-MM-DD HH:mm:ss`)
					} (by: {creator ? creator.displayName : `n/a`})</Div>*/}
				{!creating &&
					<table className="selectableAC lighterBackground" style={{/*borderCollapse: "separate", borderSpacing: "10px 0"*/}}>
						<thead>
							<tr><th>ID</th><th>Creator</th><th>Created at</th></tr>
						</thead>
						<tbody>
							<tr>
								<td>{newData._id}</td>
								<td>{creator ? creator.displayName : `n/a`}</td>
								<td>{(Moment as any)(newData.createdAt).format(`YYYY-MM-DD HH:mm:ss`)}</td>
							</tr>
						</tbody>
					</table>}
				<Div mt={5}>
					{newData.type == MapNodeType.Thesis && !newData.contentNode && !newData.metaThesis &&
						<Row style={{display: "flex", alignItems: "center"}}>
							<Pre>Relative: </Pre>
							<CheckBox enabled={editing} checked={newData.relative} onChange={val=>Change(newData.relative = val)}/>
							<InfoButton text={`"Relative" means the statement/question is too loosely worded to give a simple yes/no answer,${""
									} and should instead be evaluated in terms of the degree/intensity to which it is true. Eg. "How dangerous is sky-diving?"`}/>
						</Row>}
					{!newData.contentNode && !newData.metaThesis &&
						<Row style={{display: "flex", alignItems: "center"}}>
							<Pre>Title (base): </Pre>
							<TextInput enabled={editing} style={{flex: 1}}
								ref={a=>a && creating && this.lastRender_source == RenderSource.Mount && WaitXThenRun(0, ()=>a.DOM.focus())}
								value={newData.titles["base"]} onChange={val=>Change(newData.titles["base"] = val)}/>
						</Row>}
					{newData.type == MapNodeType.Thesis && !newData.metaThesis && newData.contentNode &&
						<QuoteInfoEditorUI key={0} ref={c=>this.quoteEditor = c} editing={creating || editing}
							contentNode={newData.contentNode} onChange={val=>Change(newData.contentNode = val)}
							showPreview={false} justShowed={false}
							//onSetError={error=>onSetError && onSetError(error)}
						/>}
					{newData.type == MapNodeType.Thesis && !newData.metaThesis && !newData.contentNode && [
						<Row key={0} mt={5} style={{display: "flex", alignItems: "center"}}>
							<Pre>Title (negation): </Pre>
							<TextInput enabled={editing} style={{flex: 1}} value={newData.titles["negation"]} onChange={val=>Change(newData.titles["negation"] = val)}/>
						</Row>,
						<Row key={1} mt={5} style={{display: "flex", alignItems: "center"}}>
							<Pre>Title (yes-no question): </Pre>
							<TextInput enabled={editing} style={{flex: 1}} value={newData.titles["yesNoQuestion"]} onChange={val=>Change(newData.titles["yesNoQuestion"] = val)}/>
						</Row>
					]}
					{creating && isArgument &&
						<Row mt={5} style={{background: "rgba(255,255,255,.1)", padding: 5, borderRadius: 5}}>
							<Pre allowWrap={true}>{`
An argument title should be a short "key phrase" that gives the gist of the argument, for easy remembering/scanning.

Examples:
* Shadow during lunar eclipses
* May have used biased sources
* Quote: Socrates

The detailed version of the argument will be embodied in its premises/child-theses.
							`.trim()}
							</Pre>
						</Row>}
					{newData.metaThesis &&
						<Row mt={5}>
							<Pre>Type: If </Pre>
							<Select options={GetEntries(MetaThesis_IfType, name=>GetMetaThesisIfTypeDisplayText(MetaThesis_IfType[name]))}
								enabled={editing} value={newData.metaThesis.ifType} onChange={val=> {
									//firebase.Ref(`nodes/${newData._id}/metaThesis`).update({ifType: val});
									Change(newData.metaThesis.ifType = val);
								}}/>
							<Pre> premises below are true, they </Pre>
							<Select options={thenTypes_forRender} enabled={editing} value={GetThenType_ForRender(newData.metaThesis.thenType)} onChange={val=> {
								val = GetThenType_ForRender(val);
								//firebase.Ref(`nodes/${newData._id}/metaThesis`).update({thenType: val});
								Change(newData.metaThesis.thenType = val);
							}}/>
							<Pre>.</Pre>
						</Row>}
					{/*newData.metaThesis && creating &&
						<Row mt={5} style={{background: "rgba(255,255,255,.1)", padding: 5, borderRadius: 5}}>
							<Pre allowWrap={true}>{`
The "type" option above describes the way in which this argument's premises will affect the conclusion (the parent thesis).${""
} The premises can be added to the map right after adding this argument node.
							`.trim()}
							</Pre>
						</Row>*/}
					{newData.type == MapNodeType.Thesis && !newData.contentNode && !newData.metaThesis && newLinkData.form != ThesisForm.YesNoQuestion &&
						<Column mt={10}>
							<Row style={{fontWeight: "bold"}}>At this location:</Row>
							<Row style={{display: "flex", alignItems: "center"}}>
								<Pre>Show as negation: </Pre>
								<CheckBox enabled={editing} checked={newLinkData.form == ThesisForm.Negation}
									onChange={val=>Change(newLinkData.form = val ? ThesisForm.Negation : ThesisForm.Base)}/>
							</Row>
						</Column>}
					{newData.type == MapNodeType.Thesis && !newData.contentNode && !newData.metaThesis && newLinkData.form == ThesisForm.YesNoQuestion && creating &&
						<Row mt={5} style={{background: "rgba(255,255,255,.1)", padding: 5, borderRadius: 5}}>
							<Pre allowWrap={true}>At this location (under a category node), the node will be displayed with the yes-no question title.</Pre>
						</Row>}
					{!creating && editing && IsArgumentNode(newData) && newData.childrenOrder &&
						<Column mt={5}>
							<Row style={{fontWeight: "bold"}}>Children order:</Row>
							{newData.childrenOrder.map((childID, index)=> {
								let child = GetNode(childID);
								let childTitle = child ? GetNodeDisplayText(child, GetNodeForm(child, newData)) : "...";
								return (
									<Row key={index} style={{display: "flex", alignItems: "center"}}>
										<Pre>Child ID: </Pre>
										<TextInput enabled={false} style={{flex: 1}} required pattern={MapNode_id}
											value={`#${newData.childrenOrder[index].toString()} (${childTitle})`}
											/*onChange={val=>Change(!IsNaN(val.ToInt()) && (newData.childrenOrder[index] = val.ToInt()))}*/
										/>
										{index > 0 &&
											<Button text={<Icon size={16} icon="arrow-up"/> as any} ml={5} enabled={index > 1}
												onClick={()=>Change(newData.childrenOrder.RemoveAt(index), newData.childrenOrder.Insert(index - 1, childID))}/>}
										{index > 0 &&
											<Button text={<Icon size={16} icon="arrow-down"/> as any} ml={5} enabled={index < newData.childrenOrder.length - 1}
												onClick={()=>Change(newData.childrenOrder.RemoveAt(index), newData.childrenOrder.Insert(index + 1, childID))}/>}
									</Row>
								);
							})}
						</Column>}
				</Div>
			</Column>
			</div>
		);
	}
	GetValidationError() {
		/*for (let key of this.refs.VKeys().filter(a=>a.startsWith("url_"))) {
			let urlComp = this.refs[key];
			let urlDOM = FindDOM(urlComp) as HTMLInputElement;
			if (urlDOM.validationMessage)
				return urlDOM.validationMessage;
		}
		return null;*/
		//return this.form.checkValidity();
		//return GetErrorMessagesForForm(this.form)[0];
		return GetErrorMessagesForForm(FindDOM(this))[0];
	}

	GetNewData() {
		let {parent} = this.props;
		let {newData} = this.state;
		let result = Clone(newData) as MapNode;
		//if (baseData.finalType != baseData.type) { // if node's type was reversed, under "negation" thesis
		/*if (IsContextReversed(newData, parent)) { // if parent is reversed, reverse ui-set then-type to get real then-type
			result.metaThesis.thenType = ReverseThenType(result.metaThesis.thenType);
		}*/
		return result;
	}
	GetNewLinkData() {
		let {newLinkData} = this.state;
		return Clone(newLinkData) as ChildEntry;
	}
}

//function GetErrorMessagesForForm(form: HTMLFormElement) {
function GetErrorMessagesForForm(form) {
	return $(form).find(":invalid").ToList().map(node=>(node[0] as any).validationMessage || 'Invalid value.');
}