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
import {MapNode, ThesisForm, ChildEntry, MapNodeEnhanced, MapNode_id, ThesisType} from "../../../../Store/firebase/nodes/@MapNode";
import QuoteInfoEditorUI from "./QuoteInfoEditorUI";
import {MapNodeType} from "../../../../Store/firebase/nodes/@MapNodeType";
import {MetaThesis_IfType, GetMetaThesisIfTypeDisplayText, MetaThesis_ThenType, MetaThesis_ThenType_Info} from "../../../../Store/firebase/nodes/@MetaThesisInfo";
import {GetParentNode, GetNodeChildren, GetNode} from "../../../../Store/firebase/nodes";
import {GetNodeForm, IsContextReversed, IsArgumentNode, GetNodeDisplayText, IsArgumentType, GetThesisType} from "../../../../Store/firebase/nodes/$node";
import {ReverseThenType} from "../../../../Store/firebase/nodes/$node/$metaThesis";
import Icon from "../../../../Frame/ReactComponents/Icon";
import Spinner from "../../../../Frame/ReactComponents/Spinner";
import EquationEditorUI from "./EquationEditorUI";
import {IsUserAdmin} from "../../../../Store/firebase/userExtras";
import {GetUserID} from "Store/firebase/users";
import ImageAttachmentEditorUI from "./ImageAttachmentEditorUI";

type Props = {
	baseData: MapNodeEnhanced, baseLinkData: ChildEntry, parent: MapNodeEnhanced, creating: boolean, editing?: boolean, style?, onChange?: (newData: MapNode, newLinkData: ChildEntry)=>void,
	//onSetError: (error: string)=>void,
} & Partial<{creator: User}>;
type State = {newData: MapNode, newLinkData: ChildEntry};
@Connect((state, {baseData, creating}: Props)=>({
	creator: !creating && GetUser(baseData.creator),
}))
export default class NodeDetailsUI extends BaseComponent<Props, State> {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) // if base-data changed
			this.SetState({newData: Clone(props.baseData).Excluding("finalType", "link"), newLinkData: Clone(props.baseLinkData)});
	}

	render() {
		let {baseData, parent, creating, editing, style, onChange, creator} = this.props;
		let {newData, newLinkData} = this.state;
		let firebase = store.firebase.helpers;
		let Change = (..._)=> {
			if (onChange)
				onChange(this.GetNewData(), this.GetNewLinkData());
			this.Update();
		};

		let propsEnhanced = {...this.props, Change, ...this.state, SetState: this.SetState};

		let thesisType = GetThesisType(baseData);

		let splitAt = 170, width = 600;
		return (
			<div> {/* needed so GetInnerComp() work */}
			<Column style={E({padding: 5}, style)}>
				{/*<Div style={{fontSize: 12}}>ID: {node._id}</Div>
				<Div mt={3} style={{fontSize: 12}}>Created at: {(Moment as any)(node.createdAt).format(`YYYY-MM-DD HH:mm:ss`)
					} (by: {creator ? creator.displayName : `n/a`})</Div>*/}
				{!creating &&
					<InfoTable {...propsEnhanced}/>}
				{newData.type == MapNodeType.Thesis && thesisType == ThesisType.Normal && !newData.metaThesis &&
					<RelativeToggle {...propsEnhanced}/>}
				{(newData.type != MapNodeType.Thesis || thesisType == ThesisType.Normal) &&
					<Title_Base {...propsEnhanced}/>}
				{newData.type == MapNodeType.Thesis && thesisType == ThesisType.Normal &&
					<OtherTitles {...propsEnhanced}/>}
				{newData.type == MapNodeType.Thesis && thesisType == ThesisType.Equation &&
					<EquationEditorUI key={0} creating={creating} editing={editing}
						baseData={newData.equation} onChange={val=>Change(newData.equation = val)}/>}
				{newData.type == MapNodeType.Thesis && thesisType == ThesisType.Quote &&
					<QuoteInfoEditorUI key={1} editing={creating || editing}
						contentNode={newData.contentNode} onChange={val=>Change(newData.contentNode = val)}
						showPreview={false} justShowed={false}/>}
				{newData.type == MapNodeType.Thesis && thesisType == ThesisType.Image &&
					<ImageAttachmentEditorUI key={1} creating={creating} editing={editing}
						baseData={newData.image} onChange={val=>Change(newData.image = val)}/>}
				{newData.metaThesis &&
					<MetaThesisInfo {...propsEnhanced}/>}
				{!creating &&
					<AdvancedOptions {...propsEnhanced}/>}
				{newData.type == MapNodeType.Thesis && thesisType == ThesisType.Normal && !newData.metaThesis && newLinkData.form != ThesisForm.YesNoQuestion &&
					<AtThisLocation {...propsEnhanced}/>}
				{!creating && editing && IsArgumentNode(newData) && newData.childrenOrder &&
					<ChildrenOrder {...propsEnhanced}/>}
			</Column>
			</div>
		);
	}
	GetValidationError() {
		return GetErrorMessagesForForm(FindDOM(this))[0];
	}

	GetNewData() {
		let {newData} = this.state;
		return Clone(newData) as MapNode;
	}
	GetNewLinkData() {
		let {newLinkData} = this.state;
		return Clone(newLinkData) as ChildEntry;
	}
}

type Props_Enhanced = Props & State & {Change};

//function GetErrorMessagesForForm(form: HTMLFormElement) {
function GetErrorMessagesForForm(form) {
	return $(form).find(":invalid").ToList().map(node=>(node[0] as any).validationMessage || `Invalid value.`);
}

class InfoTable extends BaseComponent<Props_Enhanced, {}> {
	render() {
		let {newData, creator} = this.props;
		return (
			<table className="selectableAC lighterBackground" style={{marginBottom: 5, /*borderCollapse: "separate", borderSpacing: "10px 0"*/}}>
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
			</table>
		);
	}
}

class RelativeToggle extends BaseComponent<Props_Enhanced, {}> {
	render() {
		let {editing, newData, Change} = this.props;
		return (
			<Row style={{display: "flex", alignItems: "center"}}>
				<Pre>Relative: </Pre>
				<CheckBox enabled={editing} checked={newData.relative} onChange={val=>Change(newData.relative = val)}/>
				<InfoButton text={`"Relative" means the statement/question is too loosely worded to give a simple yes/no answer,${""
						} and should instead be evaluated in terms of the degree/intensity to which it is true. Eg. "How dangerous is sky-diving?"`}/>
			</Row>
		);
	}
}

class Title_Base extends BaseComponent<Props_Enhanced, {}> {
	render() {
		let {creating, editing, newData, Change} = this.props;
		return (
			<Row style={{display: "flex", alignItems: "center"}}>
				<Pre>Title (base): </Pre>
				<TextInput enabled={editing} style={{flex: 1}}
					ref={a=>a && creating && this.lastRender_source == RenderSource.Mount && WaitXThenRun(0, ()=>a.DOM.focus())}
					value={newData.titles["base"]} onChange={val=>Change(newData.titles["base"] = val)}/>
				{creating && IsArgumentNode(newData) &&
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
			</Row>
		);
	}
}

class OtherTitles extends BaseComponent<Props_Enhanced, {}> {
	render() {
		let {newData, editing, newLinkData, creating, Change} = this.props;
		return (
			<Div>
				<Row key={0} mt={5} style={{display: "flex", alignItems: "center"}}>
					<Pre>Title (negation): </Pre>
					<TextInput enabled={editing} style={{flex: 1}} value={newData.titles["negation"]} onChange={val=>Change(newData.titles["negation"] = val)}/>
				</Row>
				<Row key={1} mt={5} style={{display: "flex", alignItems: "center"}}>
					<Pre>Title (yes-no question): </Pre>
					<TextInput enabled={editing} style={{flex: 1}} value={newData.titles["yesNoQuestion"]} onChange={val=>Change(newData.titles["yesNoQuestion"] = val)}/>
				</Row>
				{newData.type == MapNodeType.Thesis && !newData.contentNode && !newData.metaThesis && newLinkData.form == ThesisForm.YesNoQuestion && creating &&
					<Row mt={5} style={{background: "rgba(255,255,255,.1)", padding: 5, borderRadius: 5}}>
						<Pre allowWrap={true}>At this location (under a category node), the node will be displayed with the yes-no question title.</Pre>
					</Row>}
			</Div>
		);
	}
}

class MetaThesisInfo extends BaseComponent<Props_Enhanced, {}> {
	render() {
		let {editing, baseData, parent, newData, Change} = this.props;

		let isArgument = IsArgumentType(baseData.finalType);
		let reverseThenTypes = IsContextReversed(baseData, parent);
		let GetThenType_ForRender = thenType=>reverseThenTypes ? ReverseThenType(thenType) : thenType;
		let thenTypes_forRender = parent.finalType == MapNodeType.SupportingArgument
			? GetEntries(MetaThesis_ThenType, name=>MetaThesis_ThenType_Info.for[name].displayText).Take(2)
			: GetEntries(MetaThesis_ThenType, name=>MetaThesis_ThenType_Info.for[name].displayText).Skip(2);

		return (
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
				{/*newData.metaThesis && creating &&
					<Row mt={5} style={{background: "rgba(255,255,255,.1)", padding: 5, borderRadius: 5}}>
						<Pre allowWrap={true}>{`
The "type" option above describes the way in which this argument's premises will affect the conclusion (the parent thesis).${""
} The premises can be added to the map right after adding this argument node.
						`.trim()}
						</Pre>
					</Row>*/}
			</Row>
		);
	}
}

class AdvancedOptions extends BaseComponent<Props_Enhanced, {}> {
	render() {
		let {newData, Change} = this.props;
		return (
			<Column mt={10}>
				<Row style={{fontWeight: "bold"}}>Advanced:</Row>
				{IsUserAdmin(GetUserID()) &&
					<Row style={{display: "flex", alignItems: "center"}}>
						<Pre>Font-size override: </Pre>
						<Spinner max={25} value={newData.fontSizeOverride|0} onChange={val=>Change(newData.fontSizeOverride = val != 0 ? val : null)}/>
						<Pre> px (0 for auto)</Pre>
					</Row>}
				<Row mt={5} style={{display: "flex", alignItems: "center"}}>
					<Pre>Width override: </Pre>
					<Spinner step={10} max={1000} value={newData.widthOverride|0} onChange={val=>Change(newData.widthOverride = val != 0 ? val : null)}/>
					<Pre> px (0 for auto)</Pre>
				</Row>
			</Column>
		);
	}
}

class AtThisLocation extends BaseComponent<Props_Enhanced, {}> {
	render() {
		let {editing, newLinkData, Change} = this.props;
		return (
			<Column mt={10}>
				<Row style={{fontWeight: "bold"}}>At this location:</Row>
				<Row style={{display: "flex", alignItems: "center"}}>
					<Pre>Show as negation: </Pre>
					<CheckBox enabled={editing} checked={newLinkData.form == ThesisForm.Negation}
						onChange={val=>Change(newLinkData.form = val ? ThesisForm.Negation : ThesisForm.Base)}/>
				</Row>
			</Column>
		);
	}
}

class ChildrenOrder extends BaseComponent<Props_Enhanced, {}> {
	render() {
		let {newData, Change} = this.props;
		return (
			<Column mt={5}>
				<Row style={{fontWeight: "bold"}}>Children order:</Row>
				{newData.childrenOrder.map((childID, index)=> {
					let child = GetNode(childID);
					let childTitle = child ? GetNodeDisplayText(child, GetNodeForm(child, newData)) : "...";
					return (
						<Row key={index} style={{display: "flex", alignItems: "center"}}>
							<Div mr={7} sel style={{opacity: .5}}>#{childID}</Div>
							<Div sel style={{flex: 1, whiteSpace: "normal"}}>{childTitle}</Div>
							{/*<TextInput enabled={false} style={{flex: 1}} required pattern={MapNode_id}
								value={`#${childID.toString()}: ${childTitle}`}
								//onChange={val=>Change(!IsNaN(val.ToInt()) && (newData.childrenOrder[index] = val.ToInt()))}
							/>*/}
							{index > 0 &&
								<Button text={<Icon size={16} icon="arrow-up"/> as any} m={2} ml={5} style={{padding: 3}} enabled={index > 1}
									onClick={()=>Change(newData.childrenOrder.RemoveAt(index), newData.childrenOrder.Insert(index - 1, childID))}/>}
							{index > 0 &&
								<Button text={<Icon size={16} icon="arrow-down"/> as any} m={2} ml={5} style={{padding: 3}} enabled={index < newData.childrenOrder.length - 1}
									onClick={()=>Change(newData.childrenOrder.RemoveAt(index), newData.childrenOrder.Insert(index + 1, childID))}/>}
						</Row>
					);
				})}
			</Column>
		);
	}
}