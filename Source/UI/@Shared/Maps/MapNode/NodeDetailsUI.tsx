import {BaseComponent, RenderSource, FindDOM} from "react-vextensions";
import {Pre, Div} from "react-vcomponents";
import {Column} from "react-vcomponents";
import {Row} from "react-vcomponents";
import {TextInput} from "react-vcomponents";
import Moment from "moment";
import {GetUser, GetUserPermissionGroups} from "../../../../Store/firebase/users";
import {User} from "Store/firebase/users/@User";
import {Connect} from "../../../../Frame/Database/FirebaseConnect";
import {GetEntries} from "../../../../Frame/General/Enums";
import {Select} from "react-vcomponents";
import {CheckBox} from "react-vcomponents";
import {ScrollView} from "react-vscrollview";
import {Button} from "react-vcomponents";
import InfoButton from "../../../../Frame/ReactComponents/InfoButton";
import {MapNode, ClaimForm, ChildEntry, MapNodeL2, MapNode_id, ClaimType, AccessLevel, MapNodeL3, Polarity} from "../../../../Store/firebase/nodes/@MapNode";
import QuoteInfoEditorUI from "./QuoteInfoEditorUI";
import {MapNodeType} from "../../../../Store/firebase/nodes/@MapNodeType";
import {ImpactPremise_IfType, GetImpactPremiseIfTypeDisplayText, ImpactPremise_ThenType, GetImpactPremiseThenTypeDisplayText} from "./../../../../Store/firebase/nodes/@ImpactPremiseInfo";
import {GetParentNode, GetNodeChildren, GetNode, GetImpactPremiseChildNode} from "../../../../Store/firebase/nodes";
import {GetNodeForm, GetNodeDisplayText, GetClaimType, AsNodeL2, GetNodeL3} from "../../../../Store/firebase/nodes/$node";
import Icon from "../../../../Frame/ReactComponents/Icon";
import {Spinner} from "react-vcomponents";
import EquationEditorUI from "./EquationEditorUI";
import {IsUserAdmin} from "../../../../Store/firebase/userExtras";
import {GetUserID, GetUserAccessLevel} from "Store/firebase/users";
import ImageAttachmentEditorUI from "./ImageAttachmentEditorUI";
import {GetErrorMessagesUnderElement} from "js-vextensions";
import {MapNodeRevision} from "../../../../Store/firebase/nodes/@MapNodeRevision";
import {GetNodeL2, GetFinalPolarity, AsNodeL1} from "Store/firebase/nodes/$node";

type Props = {
	baseData: MapNode,
	baseRevisionData: MapNodeRevision,
	baseLinkData: ChildEntry,
	parent: MapNodeL3, forNew: boolean, forOldRevision?: boolean, enabled?: boolean,
	style?, onChange?: (newData: MapNode, newRevisionData: MapNodeRevision, newLinkData: ChildEntry, component: NodeDetailsUI)=>void,
	//onSetError: (error: string)=>void,
} & Partial<{creator: User, impactPremiseNode: MapNodeL2}>;
type State = {newData: MapNode, newRevisionData: MapNodeRevision, newLinkData: ChildEntry};
@Connect((state, {baseData, baseRevisionData, forNew}: Props)=>({
	creator: !forNew && GetUser(baseData.creator),
	impactPremiseNode: GetImpactPremiseChildNode(baseData.Extended({current: baseRevisionData})),
}))
export default class NodeDetailsUI extends BaseComponent<Props, State> {
	static defaultProps = {enabled: true};

	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) // if base-data changed
			this.SetState({
				newData: AsNodeL1(Clone(props.baseData)),
				newRevisionData: Clone(props.baseRevisionData),
				newLinkData: Clone(props.baseLinkData),
			});
	}

	quoteEditor: QuoteInfoEditorUI;
	render() {
		let {baseData, impactPremiseNode, parent, forNew, forOldRevision, enabled, style, onChange, creator} = this.props;
		let {newData, newLinkData, newRevisionData} = this.state;
		let firebase = store.firebase.helpers;
		let Change = (..._)=> {
			if (onChange)
				onChange(this.GetNewData(), this.GetNewRevisionData(), this.GetNewLinkData(), this);
			this.Update();
		};

		let newDataAsL2 = AsNodeL2(newData, newRevisionData);

		let propsEnhanced = {...this.props, Change, newDataAsL2, ...this.state, SetState: this.SetState};
		let claimType = GetClaimType(newDataAsL2);

		let splitAt = 170, width = 600;
		let isArgument_any = impactPremiseNode && impactPremiseNode.current.impactPremise.ifType == ImpactPremise_IfType.Any;
		return (
			<div> {/* needed so GetInnerComp() works */}
			<Column style={E({padding: 5}, style)}>
				{/*<Div style={{fontSize: 12}}>ID: {node._id}</Div>
				<Div mt={3} style={{fontSize: 12}}>Created at: {Moment(node.createdAt).format(`YYYY-MM-DD HH:mm:ss`)
					} (by: {creator ? creator.displayName : `n/a`})</Div>*/}
				{newData.type == MapNodeType.Claim && (claimType == ClaimType.Normal || claimType == ClaimType.Equation) && !newRevisionData.impactPremise &&
					<RelativeToggle {...propsEnhanced}/>}
				{(newData.type != MapNodeType.Claim || claimType == ClaimType.Normal) &&
					<Title_Base {...propsEnhanced}/>}
				{newData.type == MapNodeType.Claim && claimType == ClaimType.Normal &&
					<OtherTitles {...propsEnhanced}/>}
				{newData.type == MapNodeType.Claim && claimType == ClaimType.Equation &&
					<EquationEditorUI key={0} creating={forNew} editing={enabled}
						baseData={newRevisionData.equation} onChange={val=>Change(newRevisionData.equation = val)}/>}
				{newData.type == MapNodeType.Claim && claimType == ClaimType.Quote &&
					<QuoteInfoEditorUI ref={c=>this.quoteEditor = c} key={1} creating={forNew} editing={enabled}
						baseData={newRevisionData.contentNode} onChange={val=>Change(newRevisionData.contentNode = val)}
						showPreview={false} justShowed={false}/>}
				{newData.type == MapNodeType.Claim && claimType == ClaimType.Image &&
					<ImageAttachmentEditorUI key={1} creating={forNew} editing={enabled}
						baseData={newRevisionData.image} onChange={val=>Change(newRevisionData.image = val)}/>}
				{newRevisionData.impactPremise &&
					<ImpactPremiseInfo {...propsEnhanced}/>}
				<Row mt={5}>
					<Pre>Note: </Pre>
					<TextInput enabled={enabled} style={{width: "100%"}}
						value={newRevisionData.note} onChange={val=>Change(newRevisionData.note = val)}/>
				</Row>
				{!forNew &&
					<AdvancedOptions {...propsEnhanced}/>}
				{!forNew && enabled && newDataAsL2.type == MapNodeType.Argument && newData.childrenOrder && !isArgument_any &&
					<ChildrenOrder {...propsEnhanced}/>}
			</Column>
			</div>
		);
	}
	PostRender(source: RenderSource) {
		if (source != RenderSource.Mount) return;
		let {onChange} = this.props;
		if (onChange) onChange(this.GetNewData(), this.GetNewRevisionData(), this.GetNewLinkData(), this); // trigger on-change once, to check for validation-error
	}
	GetValidationError() {
		if (this.quoteEditor) {
			let quoteError = this.quoteEditor.GetValidationError();
			if (quoteError) return quoteError;
		}
		return GetErrorMessagesUnderElement(FindDOM(this))[0];
	}

	GetNewData() {
		let {newData} = this.state;
		return Clone(newData) as MapNode;
	}
	GetNewRevisionData() {
		let {newRevisionData} = this.state;
		return Clone(newRevisionData) as MapNodeRevision;
	}
	GetNewLinkData() {
		let {newLinkData} = this.state;
		return Clone(newLinkData) as ChildEntry;
	}
}

type Props_Enhanced = Props & State & {newDataAsL2, Change};

class RelativeToggle extends BaseComponent<Props_Enhanced, {}> {
	render() {
		let {enabled, newRevisionData, Change} = this.props;
		return (
			<Row style={{display: "flex", alignItems: "center"}}>
				<Pre>Relative: </Pre>
				<CheckBox enabled={enabled} checked={newRevisionData.relative} onChange={val=>Change(newRevisionData.relative = val)}/>
				<InfoButton text={`"Relative" means the statement/question is too loosely worded to give a simple yes/no answer,${""
						} and should instead be evaluated in terms of the degree/intensity to which it is true. Eg. "How dangerous is sky-diving?"`}/>
			</Row>
		);
	}
}

class Title_Base extends BaseComponent<Props_Enhanced, {}> {
	render() {
		let {forNew, enabled, newData, newDataAsL2, newRevisionData, newLinkData, Change} = this.props;
		let claimType = GetClaimType(newDataAsL2);
		let hasOtherTitles = newData.type == MapNodeType.Claim && claimType == ClaimType.Normal;
		let hasOtherTitlesEntered = newRevisionData.titles["negation"] || newRevisionData.titles["yesNoQuestion"];
		let willUseYesNoTitleHere = WillNodeUseQuestionTitleHere(newDataAsL2, newLinkData);
		return (
			<div>
				<Row style={{display: "flex", alignItems: "center"}}>
					<Pre>Title (base): </Pre>
					<TextInput enabled={enabled} style={{flex: 1}} required={!hasOtherTitlesEntered && !willUseYesNoTitleHere}
						ref={a=>a && forNew && this.lastRender_source == RenderSource.Mount && WaitXThenRun(0, ()=>a.DOM.focus())}
						value={newRevisionData.titles["base"]} onChange={val=>Change(newRevisionData.titles["base"] = val)}/>
				</Row>
				{forNew && newData.type == MapNodeType.Argument &&
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
			</div>
		);
	}
}

function WillNodeUseQuestionTitleHere(node: MapNodeL2, linkData: ChildEntry) {
	return node.type == MapNodeType.Claim && !node.current.contentNode && !node.current.impactPremise && linkData && linkData.form == ClaimForm.YesNoQuestion;
}

class OtherTitles extends BaseComponent<Props_Enhanced, {}> {
	render() {
		let {newDataAsL2, newRevisionData, forNew, enabled, newLinkData, Change} = this.props;
		let willUseQuestionTitleHere = WillNodeUseQuestionTitleHere(newDataAsL2, newLinkData);
		return (
			<Div>
				<Row key={0} mt={5} style={{display: "flex", alignItems: "center"}}>
					<Pre>Title (negation): </Pre>
					<TextInput enabled={enabled} style={{flex: 1}} value={newRevisionData.titles["negation"]} onChange={val=>Change(newRevisionData.titles["negation"] = val)}/>
				</Row>
				<Row key={1} mt={5} style={{display: "flex", alignItems: "center"}}>
					<Pre>Title (question): </Pre>
					<TextInput enabled={enabled} style={{flex: 1}} required={willUseQuestionTitleHere}
						value={newRevisionData.titles["yesNoQuestion"]} onChange={val=>Change(newRevisionData.titles["yesNoQuestion"] = val)}/>
				</Row>
				{willUseQuestionTitleHere && forNew &&
					<Row mt={5} style={{background: "rgba(255,255,255,.1)", padding: 5, borderRadius: 5}}>
						<Pre allowWrap={true}>At this location (under a category node), the node will be displayed with the (yes or no) question title.</Pre>
					</Row>}
			</Div>
		);
	}
}

class ImpactPremiseInfo extends BaseComponent<Props_Enhanced, {}> {
	render() {
		let {enabled, baseRevisionData, parent, newData, newDataAsL2, newRevisionData, newLinkData, Change} = this.props;

		let polarity = GetFinalPolarity(newLinkData.polarity, parent.link.form);
		let thenTypes_forRender = [
			{name: GetImpactPremiseThenTypeDisplayText(ImpactPremise_ThenType.Impact, parent.finalPolarity), value: ImpactPremise_ThenType.Impact},
			{name: GetImpactPremiseThenTypeDisplayText(ImpactPremise_ThenType.Guarantee, parent.finalPolarity), value: ImpactPremise_ThenType.Guarantee},
		];
		let GetThenType_ForRender = thenType=>thenTypes_forRender.find(a=>a.value == thenType);

		return (
			<Row mt={5}>
				<Pre>Type: If </Pre>
				<Select options={GetEntries(ImpactPremise_IfType, name=>GetImpactPremiseIfTypeDisplayText(ImpactPremise_IfType[name]))}
					enabled={enabled} value={newRevisionData.impactPremise.ifType} onChange={val=> {
						//firebase.DBRef(`nodes/${newData._id}/impactPremise`).update({ifType: val});
						Change(newRevisionData.impactPremise.ifType = val);
					}}/>
				<Pre> premises below are true, they </Pre>
				<Select options={thenTypes_forRender} enabled={enabled} value={newRevisionData.impactPremise.thenType} onChange={val=> {
					//firebase.DBRef(`nodes/${newData._id}/impactPremise`).update({thenType: val});
					Change(newRevisionData.impactPremise.thenType = val);
				}}/>
				<Pre>.</Pre>
				{/*newData.impactPremise && creating &&
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
		let {newData, newRevisionData, forNew, enabled, Change} = this.props;
		return (
			<Column mt={10}>
				<Row style={{fontWeight: "bold"}}>Advanced:</Row>
				{IsUserAdmin(GetUserID()) &&
					<Row style={{display: "flex", alignItems: "center"}}>
						<Pre>Voting enabled: </Pre>
						<CheckBox enabled={enabled} checked={!newRevisionData.votingDisabled} onChange={val=>Change(newRevisionData.votingDisabled = val ? null : true)}/>
					</Row>}
				{IsUserAdmin(GetUserID()) &&
					<Row style={{display: "flex", alignItems: "center"}}>
						<Pre>Font-size override: </Pre>
						<Spinner max={25} enabled={enabled} value={newRevisionData.fontSizeOverride|0} onChange={val=>Change(newRevisionData.fontSizeOverride = val != 0 ? val : null)}/>
						<Pre> px (0 for auto)</Pre>
					</Row>}
				<Row mt={5} style={{display: "flex", alignItems: "center"}}>
					<Pre>Width override: </Pre>
					<Spinner step={10} max={1000} enabled={enabled} value={newRevisionData.widthOverride|0} onChange={val=>Change(newRevisionData.widthOverride = val != 0 ? val : null)}/>
					<Pre> px (0 for auto)</Pre>
				</Row>
				<Row mt={5} style={{display: "flex", alignItems: "center"}}>
					<Pre>Access level: </Pre>
					<Select options={GetEntries(AccessLevel).filter(a=>a.value <= GetUserAccessLevel(GetUserID()))} enabled={enabled}
						value={newRevisionData.accessLevel || AccessLevel.Basic}
						onChange={val=>Change(val == AccessLevel.Basic ? delete newRevisionData.accessLevel : newRevisionData.accessLevel = val)}/>
				</Row>
			</Column>
		);
	}
}

class ChildrenOrder extends BaseComponent<Props_Enhanced, {}> {
	render() {
		let {newData, newDataAsL2, Change} = this.props;
		return (
			<Column mt={5}>
				<Row style={{fontWeight: "bold"}}>Children order:</Row>
				{newData.childrenOrder.map((childID, index)=> {
					let childPath = (newData._id ? newData._id + "/" : "") + childID;
					let child = GetNodeL3(childPath);
					let childTitle = child ? GetNodeDisplayText(child, childPath, GetNodeForm(child, newDataAsL2)) : "...";
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