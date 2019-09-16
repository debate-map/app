import {AsNodeL1, GetFinalPolarity} from "Store/firebase/nodes/$node";
import {GetUserAccessLevel, GetUserID} from "Store/firebase/users";
import {User} from "Store/firebase/users/@User";
import {GetErrorMessagesUnderElement} from "js-vextensions";
import {CheckBox, Column, Div, Pre, Row, Select, Spinner, TextArea_AutoSize, TextInput} from "react-vcomponents";
import {BaseComponent, RenderSource} from "react-vextensions";
import {Connect} from "../../../../Frame/Database/FirebaseConnect";
import {GetEntries} from "../../../../Frame/General/Enums";
import {AsNodeL2, GetClaimType} from "../../../../Store/firebase/nodes/$node";
import {AccessLevel, ChildEntry, ClaimForm, ClaimType, MapNode, MapNodeL2, MapNodeL3} from "../../../../Store/firebase/nodes/@MapNode";
import {ArgumentType, GetArgumentTypeDisplayText, MapNodeRevision, MapNodeRevision_titlePattern} from "../../../../Store/firebase/nodes/@MapNodeRevision";
import {MapNodeType} from "../../../../Store/firebase/nodes/@MapNodeType";
import {IsUserAdmin} from "../../../../Store/firebase/userExtras";
import {GetUser} from "../../../../Store/firebase/users";
import EquationEditorUI from "./EquationEditorUI";
import ImageAttachmentEditorUI from "./ImageAttachmentEditorUI";
import QuoteInfoEditorUI from "./QuoteInfoEditorUI";

type Props = {
	baseData: MapNode,
	baseRevisionData: MapNodeRevision,
	baseLinkData: ChildEntry,
	parent: MapNodeL3, forNew: boolean, forOldRevision?: boolean, enabled?: boolean,
	style?, onChange?: (newData: MapNode, newRevisionData: MapNodeRevision, newLinkData: ChildEntry, component: NodeDetailsUI)=>void,
	//onSetError: (error: string)=>void,
} & Partial<{creator: User}>;
type Props_Enhanced = Props & State & {newDataAsL2, Change};
type State = {newData: MapNode, newRevisionData: MapNodeRevision, newLinkData: ChildEntry};

@Connect((state, {baseData, baseRevisionData, forNew}: Props)=>({
	creator: !forNew && GetUser(baseData.creator),
}))
export class NodeDetailsUI extends BaseComponent<Props, State> {
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
		let {baseData, parent, forNew, forOldRevision, enabled, style, onChange, creator} = this.props;
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

		let splitAt = 170;
		return (
			<Column style={E({padding: 5}, style)}>
				{/*<Div style={{fontSize: 12}}>ID: {node._id}</Div>
				<Div mt={3} style={{fontSize: 12}}>Created at: {Moment(node.createdAt).format(`YYYY-MM-DD HH:mm:ss`)
					} (by: {creator ? creator.displayName : `n/a`})</Div>*/}
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
				{newData.type == MapNodeType.Argument &&
					<ArgumentInfo {...propsEnhanced}/>}
				<Row mt={5}>
					<Pre>Note: </Pre>
					<TextInput enabled={enabled} style={{width: "100%"}}
						value={newRevisionData.note} onChange={val=>Change(newRevisionData.note = val)}/>
				</Row>
				{!forNew &&
					<AdvancedOptions {...propsEnhanced}/>}
			</Column>
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
		return GetErrorMessagesUnderElement(GetDOM(this))[0];
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

class Title_Base extends BaseComponent<Props_Enhanced, {}> {
	render() {
		let {forNew, enabled, newData, newDataAsL2, newRevisionData, newLinkData, Change} = this.props;
		let claimType = GetClaimType(newDataAsL2);
		let hasOtherTitles = newData.type == MapNodeType.Claim && claimType == ClaimType.Normal;
		let hasOtherTitlesEntered = newRevisionData.titles.negation || newRevisionData.titles.yesNoQuestion;
		let willUseYesNoTitleHere = WillNodeUseQuestionTitleHere(newDataAsL2, newLinkData);
		return (
			<div>
				<Row style={{display: "flex", alignItems: "center"}}>
					<Pre>Title (base): </Pre>
					{/*<TextInput enabled={enabled} style={ES({flex: 1})} required={!hasOtherTitlesEntered && !willUseYesNoTitleHere}
						ref={a=>a && forNew && this.lastRender_source == RenderSource.Mount && WaitXThenRun(0, ()=>a.DOM.focus())}
						value={newRevisionData.titles["base"]} onChange={val=>Change(newRevisionData.titles["base"] = val)}/>*/}
					<TextArea_AutoSize enabled={enabled} required={!hasOtherTitlesEntered && !willUseYesNoTitleHere} pattern={MapNodeRevision_titlePattern}
						allowLineBreaks={false} style={ES({flex: 1})}
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

The detailed version of the argument will be embodied in its premises/child-claims.
						`.trim()}
						</Pre>
					</Row>}
			</div>
		);
	}
}

function WillNodeUseQuestionTitleHere(node: MapNodeL2, linkData: ChildEntry) {
	return node.type == MapNodeType.Claim && !node.current.contentNode && linkData && linkData.form == ClaimForm.YesNoQuestion;
}

class OtherTitles extends BaseComponent<Props_Enhanced, {}> {
	render() {
		let {newDataAsL2, newRevisionData, forNew, enabled, newLinkData, Change} = this.props;
		let willUseQuestionTitleHere = WillNodeUseQuestionTitleHere(newDataAsL2, newLinkData);
		return (
			<Div>
				<Row key={0} mt={5} style={{display: "flex", alignItems: "center"}}>
					<Pre>Title (negation): </Pre>
					{/*<TextInput enabled={enabled} style={ES({flex: 1})} value={newRevisionData.titles["negation"]} onChange={val=>Change(newRevisionData.titles["negation"] = val)}/>*/}
					<TextArea_AutoSize enabled={enabled} allowLineBreaks={false} style={ES({flex: 1})} pattern={MapNodeRevision_titlePattern}
						value={newRevisionData.titles["negation"]} onChange={val=>Change(newRevisionData.titles["negation"] = val)}/>
				</Row>
				<Row key={1} mt={5} style={{display: "flex", alignItems: "center"}}>
					<Pre>Title (question): </Pre>
					{/*<TextInput enabled={enabled} style={ES({flex: 1})} required={willUseQuestionTitleHere}
						value={newRevisionData.titles["yesNoQuestion"]} onChange={val=>Change(newRevisionData.titles["yesNoQuestion"] = val)}/>*/}
					<TextArea_AutoSize enabled={enabled} allowLineBreaks={false} style={ES({flex: 1})} pattern={MapNodeRevision_titlePattern}
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

class ArgumentInfo extends BaseComponent<Props_Enhanced, {}> {
	render() {
		let {enabled, baseRevisionData, parent, newData, newDataAsL2, newRevisionData, newLinkData, Change} = this.props;

		let polarity = GetFinalPolarity(newLinkData.polarity, newLinkData.form);

		return (
			<Row>
				<Pre>Type: If </Pre>
				<Select options={GetEntries(ArgumentType, name=>GetArgumentTypeDisplayText(ArgumentType[name]))}
					enabled={enabled} value={newRevisionData.argumentType} onChange={val=> {
						Change(newRevisionData.argumentType = val);
					}}/>
				<Pre> premises below are true, they impact the parent.</Pre>
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