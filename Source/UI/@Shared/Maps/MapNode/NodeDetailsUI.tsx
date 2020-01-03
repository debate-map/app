import {AsNodeL1, GetFinalPolarity, AsNodeL2} from "Store/firebase/nodes/$node";
import {GetUserAccessLevel, MeID, GetUser} from "Store/firebase/users";
import {User} from "Store/firebase/users/@User";
import {GetErrorMessagesUnderElement, Clone, WaitXThenRun, ToNumber, GetEntries, E} from "js-vextensions";
import {CheckBox, Column, Div, Pre, Row, Select, Spinner, TextArea, TextInput, Text, RowLR} from "react-vcomponents";
import {BaseComponent, RenderSource, GetDOM, BaseComponentPlus} from "react-vextensions";
import {HasAdminPermissions, HasModPermissions} from "Store/firebase/userExtras";
import {ES} from "Utils/UI/GlobalStyles";
import {InfoButton, Observer} from "vwebapp-framework";
import {GetOpenMapID} from "Store/main";

import {store} from "Store";
import {runInAction} from "mobx";
import {GetAttachmentType, AttachmentType, ResetNodeRevisionAttachment} from "Store/firebase/nodeRevisions/@AttachmentType";
import {AccessLevel, ChildEntry, ClaimForm, MapNode, MapNodeL2, MapNodeL3, globalMapID} from "../../../../Store/firebase/nodes/@MapNode";
import {ArgumentType, GetArgumentTypeDisplayText, MapNodeRevision, MapNodeRevision_titlePattern, PermissionInfo, PermissionInfoType, MapNodeRevision_Defaultable} from "../../../../Store/firebase/nodes/@MapNodeRevision";
import {MapNodeType} from "../../../../Store/firebase/nodes/@MapNodeType";

import {EquationEditorUI} from "./EquationEditorUI";
import {ImageAttachmentEditorUI} from "./ImageAttachmentEditorUI";
import {QuoteInfoEditorUI} from "./QuoteInfoEditorUI";
import {DetailsPanel_Subpanel} from "./NodeUI/Panels/DetailsPanel";

type Props = {
	baseData: MapNode,
	baseRevisionData: MapNodeRevision,
	baseLinkData: ChildEntry,
	parent: MapNodeL3, forNew: boolean, forOldRevision?: boolean, enabled?: boolean,
	style?, onChange?: (newData: MapNode, newRevisionData: MapNodeRevision, newLinkData: ChildEntry, component: NodeDetailsUI)=>void,
	// onSetError: (error: string)=>void,
	// validateNewData: (newData: MapNode, newRevisionData: MapNodeRevision)=>void,
};
type State = {newData: MapNode, newRevisionData: MapNodeRevision, newLinkData: ChildEntry};
type SharedProps = Props & State & {newDataAsL2, Change, SetState};

@Observer
export class NodeDetailsUI extends BaseComponentPlus({enabled: true} as Props, {} as State) {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) { // if base-data changed
			this.SetState({
				newData: AsNodeL1(Clone(props.baseData)),
				newRevisionData: Clone(props.baseRevisionData),
				newLinkData: Clone(props.baseLinkData),
			});
		}
	}

	quoteEditor: QuoteInfoEditorUI;
	render() {
		const {baseData, parent, forNew, forOldRevision, enabled, style, onChange} = this.props;
		const {newData, newLinkData, newRevisionData} = this.state;
		const Change = (..._)=>{
			if (onChange) { onChange(this.GetNewData(), this.GetNewRevisionData(), this.GetNewLinkData(), this); }
			this.Update();
		};

		const newDataAsL2 = AsNodeL2(newData, newRevisionData);

		const sharedProps: SharedProps = {...this.props, Change, newDataAsL2, ...this.state, SetState: this.SetState};
		const attachmentType = GetAttachmentType(newDataAsL2);

		const splitAt = 170;
		const subpanel = store.main.maps.detailsPanel.subpanel;
		return (
			<Column style={E({padding: 5}, style)}>
				<Row mb={5}>
					<Select displayType="button bar" options={GetEntries(DetailsPanel_Subpanel)} value={subpanel} onChange={val=>{
						runInAction("NodeDetailsUI.subpanel.onChange", ()=>store.main.maps.detailsPanel.subpanel = val);
					}}/>
				</Row>
				{subpanel == DetailsPanel_Subpanel.Text &&
				<>
					{(newData.type != MapNodeType.Claim || attachmentType == AttachmentType.None) &&
						<Title_Base {...sharedProps}/>}
					{newData.type == MapNodeType.Claim && attachmentType == AttachmentType.None &&
						<OtherTitles {...sharedProps}/>}
					{newData.type == MapNodeType.Argument &&
						<ArgumentInfo {...sharedProps}/>}
					<Row mt={5}>
						<Text>Note: </Text>
						<TextInput enabled={enabled} style={{width: "100%"}}
							value={newRevisionData.note} onChange={val=>Change(newRevisionData.note = val)}/>
					</Row>
				</>}
				{subpanel == DetailsPanel_Subpanel.Attachment &&
				<>
					{newData.type != MapNodeType.Claim &&
						<Text>Only claim nodes can have attachments.</Text>}
					{newData.type == MapNodeType.Claim &&
					<>
						<Row mb={attachmentType == AttachmentType.None ? 0 : 5}>
							<Text>Type:</Text>
							<Select ml={5} options={GetEntries(AttachmentType)} value={attachmentType} onChange={val=>{
								ResetNodeRevisionAttachment(newRevisionData, val);
								Change();
							}}/>
						</Row>
						{attachmentType == AttachmentType.Equation &&
							<EquationEditorUI key={0} creating={forNew} editing={enabled}
								baseData={newRevisionData.equation} onChange={val=>Change(newRevisionData.equation = val)}/>}
						{attachmentType == AttachmentType.Quote &&
							<QuoteInfoEditorUI ref={c=>this.quoteEditor = c} key={1} creating={forNew} editing={enabled}
								baseData={newRevisionData.quote} onChange={val=>Change(newRevisionData.quote = val)}
								showPreview={false} justShowed={false}/>}
						{attachmentType == AttachmentType.Image &&
							<ImageAttachmentEditorUI key={1} creating={forNew} editing={enabled}
								baseData={newRevisionData.image} onChange={val=>Change(newRevisionData.image = val)}/>}
					</>}
				</>}
				{subpanel == DetailsPanel_Subpanel.Permissions &&
					<PermissionsOptions {...sharedProps}/>}
				{subpanel == DetailsPanel_Subpanel.Others &&
					<OthersOptions {...sharedProps}/>}
			</Column>
		);
	}
	PostRender(source: RenderSource) {
		if (source != RenderSource.Mount) return;
		const {onChange} = this.props;
		if (onChange) onChange(this.GetNewData(), this.GetNewRevisionData(), this.GetNewLinkData(), this); // trigger on-change once, to check for validation-error
	}
	GetValidationError() {
		if (this.quoteEditor) {
			const quoteError = this.quoteEditor.GetValidationError();
			if (quoteError) return quoteError;
		}
		return GetErrorMessagesUnderElement(GetDOM(this))[0];
	}

	GetNewData() {
		const {newData} = this.state;
		return Clone(newData) as MapNode;
	}
	GetNewRevisionData() {
		const {newRevisionData} = this.state;
		return Clone(newRevisionData) as MapNodeRevision;
	}
	GetNewLinkData() {
		const {newLinkData} = this.state;
		return Clone(newLinkData) as ChildEntry;
	}
}

class Title_Base extends BaseComponent<SharedProps, {}> {
	render() {
		const {forNew, enabled, newData, newDataAsL2, newRevisionData, newLinkData, Change} = this.props;
		const claimType = GetAttachmentType(newDataAsL2);
		const hasOtherTitles = newData.type == MapNodeType.Claim && claimType == AttachmentType.None;
		const hasOtherTitlesEntered = newRevisionData.titles.negation || newRevisionData.titles.yesNoQuestion;
		const willUseYesNoTitleHere = WillNodeUseQuestionTitleHere(newDataAsL2, newLinkData);

		return (
			<div>
				<Row center>
					<Text>Title (base): </Text>
					{/* <TextInput enabled={enabled} style={ES({flex: 1})} required={!hasOtherTitlesEntered && !willUseYesNoTitleHere}
						ref={a=>a && forNew && this.lastRender_source == RenderSource.Mount && WaitXThenRun(0, ()=>a.DOM.focus())}
						value={newRevisionData.titles["base"]} onChange={val=>Change(newRevisionData.titles["base"] = val)}/> */}
					<TextArea enabled={enabled} required={!hasOtherTitlesEntered && !willUseYesNoTitleHere} pattern={MapNodeRevision_titlePattern} autoSize={true}
						allowLineBreaks={false} style={ES({flex: 1})}
						ref={a=>a && forNew && this.lastRender_source == RenderSource.Mount && WaitXThenRun(0, ()=>a.DOM && a.DOM_HTML.focus())}
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
	return node.type == MapNodeType.Claim && !node.current.quote && linkData && linkData.form == ClaimForm.YesNoQuestion;
}

class OtherTitles extends BaseComponent<SharedProps, {}> {
	render() {
		const {newDataAsL2, newRevisionData, forNew, enabled, newLinkData, Change} = this.props;
		const willUseQuestionTitleHere = WillNodeUseQuestionTitleHere(newDataAsL2, newLinkData);
		return (
			<Div>
				<Row key={0} mt={5} style={{display: "flex", alignItems: "center"}}>
					<Pre>Title (negation): </Pre>
					{/* <TextInput enabled={enabled} style={ES({flex: 1})} value={newRevisionData.titles["negation"]} onChange={val=>Change(newRevisionData.titles["negation"] = val)}/> */}
					<TextArea enabled={enabled} allowLineBreaks={false} style={ES({flex: 1})} pattern={MapNodeRevision_titlePattern} autoSize={true}
						value={newRevisionData.titles["negation"]} onChange={val=>Change(newRevisionData.titles["negation"] = val)}/>
				</Row>
				<Row key={1} mt={5} style={{display: "flex", alignItems: "center"}}>
					<Pre>Title (question): </Pre>
					{/* <TextInput enabled={enabled} style={ES({flex: 1})} required={willUseQuestionTitleHere}
						value={newRevisionData.titles["yesNoQuestion"]} onChange={val=>Change(newRevisionData.titles["yesNoQuestion"] = val)}/> */}
					<TextArea enabled={enabled} allowLineBreaks={false} style={ES({flex: 1})} pattern={MapNodeRevision_titlePattern} autoSize={true}
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

class ArgumentInfo extends BaseComponent<SharedProps, {}> {
	render() {
		const {enabled, baseRevisionData, parent, newData, newDataAsL2, newRevisionData, newLinkData, Change} = this.props;

		const polarity = GetFinalPolarity(newLinkData.polarity, newLinkData.form);

		return (
			<Row>
				<Pre>Type: If </Pre>
				<Select options={GetEntries(ArgumentType, name=>GetArgumentTypeDisplayText(ArgumentType[name]))}
					enabled={enabled} value={newRevisionData.argumentType} onChange={val=>{
						Change(newRevisionData.argumentType = val);
					}}/>
				<Pre> premises below are true, they impact the parent.</Pre>
			</Row>
		);
	}
}

// @Observer
// export class PermissionsOptions extends BaseComponent<Pick<SharedProps, 'newData' | 'newRevisionData' | 'enabled' | 'Change'> & {forDefaultsInMap?: boolean}, {}> {
export class PermissionsOptions extends BaseComponent<Pick<SharedProps, "enabled" | "Change"> & {newRevisionData: MapNodeRevision_Defaultable, forDefaultsInMap?: boolean}, {}> {
	render() {
		const {newRevisionData, enabled, Change, forDefaultsInMap} = this.props;
		const openMapID = GetOpenMapID();

		// probably temp
		if (newRevisionData.permission_edit == null) {
			newRevisionData.permission_edit = {type: PermissionInfoType.Creator};
		}
		if (newRevisionData.permission_contribute == null) {
			newRevisionData.permission_contribute = {type: PermissionInfoType.Anyone};
		}

		const splitAt = 80;
		return (
			<>
				{!forDefaultsInMap &&
				<Row center style={{fontSize: 13, opacity: .5}}>
					<Text>Note: In addition to the groups listed below, mods and admins always have full permissions.</Text>
				</Row>}
				{HasModPermissions(MeID()) &&
				<RowLR mt={5} splitAt={splitAt} style={{display: "flex", alignItems: "center"}}>
					<Text>View:</Text>
					<Select options={GetEntries(AccessLevel).filter(a=>a.value <= GetUserAccessLevel(MeID()))} enabled={enabled}
						value={newRevisionData.accessLevel || AccessLevel.Basic}
						// onChange={val => Change(val == AccessLevel.Basic ? delete newRevisionData.accessLevel : newRevisionData.accessLevel = val)}/>
						onChange={val=>Change(newRevisionData.accessLevel = val)}/>
					<InfoButton ml={5} text="Allows viewing/accessing the node -- both in maps, and when directly linked. (creator always allowed)"/>
				</RowLR>}
				{HasAdminPermissions(MeID()) &&
				<RowLR mt={5} splitAt={splitAt} style={{display: "flex", alignItems: "center"}}>
					<Text>Rate:</Text>
					<CheckBox enabled={enabled} checked={!newRevisionData.votingDisabled} onChange={val=>Change(newRevisionData.votingDisabled = val ? null : true)}/>
				</RowLR>}
				<RowLR mt={5} splitAt={splitAt} style={{display: "flex", alignItems: "center"}}>
					<Text>Edit:</Text>
					<Select options={GetEntries(PermissionInfoType)} enabled={enabled}
						value={newRevisionData.permission_edit.type}
						onChange={val=>Change(newRevisionData.permission_edit.type = val)}/>
					<InfoButton ml={5} text={`
						Allows changing values in ${forDefaultsInMap ? "the node's" : "this"} Details panel.
						* Creator: Only the node creator is allowed.
						* MapEditors: Only editors of the current map (and node creator) are allowed.
						* Anyone: Any signed-in user is allowed.
					`.AsMultiline(0)}/>
					{/* newRevisionData.permission_edit.type == PermissionInfoType.MapEditors &&
						<Text ml={5} sel style={{ opacity: 0.5 }}>(of map: {newData.ownerMapID})</Text> */}
				</RowLR>
				<RowLR mt={5} splitAt={splitAt} style={{display: "flex", alignItems: "center"}}>
					<Text>Contribute:</Text>
					<Select options={GetEntries(PermissionInfoType).filter(a=>(openMapID == globalMapID ? a.value == PermissionInfoType.Anyone : true))} enabled={enabled}
						value={newRevisionData.permission_contribute.type}
						// onChange={val => Change(val == AccessLevel.Basic ? delete newRevisionData.accessLevel : newRevisionData.accessLevel = val)}/>
						onChange={val=>Change(newRevisionData.permission_contribute.type = val)}/>
					<InfoButton ml={5} text={`
						Allows adding children nodes (and removing the entries one has added).
						* Creator: Only the node creator is allowed.
						* MapEditors: Only editors of the current map (and node creator) are allowed.
						* Anyone: Any signed-in user is allowed. (required for public/global maps)
					`.AsMultiline(0)}/>
					{/* newRevisionData.permission_contribute.type == PermissionInfoType.MapEditors &&
						<Text ml={5} sel style={{ opacity: 0.5 }}>(of map: {newData.ownerMapID})</Text> */}
				</RowLR>
			</>
		);
	}
}

class OthersOptions extends BaseComponent<SharedProps, {}> {
	render() {
		const {newData, newRevisionData, forNew, enabled, Change} = this.props;
		return (
			<>
				{/*<Row style={{fontWeight: "bold"}}>Others:</Row>*/}
				{HasAdminPermissions(MeID()) &&
					<Row style={{display: "flex", alignItems: "center"}}>
						<Pre>Font-size override: </Pre>
						<Spinner max={25} enabled={enabled} value={ToNumber(newRevisionData.fontSizeOverride, 0)} onChange={val=>Change(newRevisionData.fontSizeOverride = val != 0 ? val : null)}/>
						<Pre> px (0 for auto)</Pre>
					</Row>}
				<Row mt={5} style={{display: "flex", alignItems: "center"}}>
					<Pre>Width override: </Pre>
					<Spinner step={10} max={1000} enabled={enabled} value={ToNumber(newRevisionData.widthOverride, 0)} onChange={val=>Change(newRevisionData.widthOverride = val != 0 ? val : null)}/>
					<Pre> px (0 for auto)</Pre>
				</Row>
			</>
		);
	}
}