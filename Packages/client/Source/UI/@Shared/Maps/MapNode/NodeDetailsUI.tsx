import {Clone, E, GetEntries, GetErrorMessagesUnderElement, CloneWithPrototypes} from "web-vcore/nm/js-vextensions.js";
import {runInAction} from "web-vcore/nm/mobx.js";
import {Column, Row, Select} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, GetDOM, RenderSource} from "web-vcore/nm/react-vextensions.js";
import {store} from "Store";
import {Observer} from "web-vcore";
import {DetailsPanel_Subpanel} from "Store/main/maps";
import {MapNode, MapNodeL3, MapNodeRevision, AsNodeL1, AsNodeL2, GetAttachmentType} from "dm_common";
import {AttachmentPanel} from "./NodeDetailsUI/AttachmentPanel.js";
import {OthersPanel} from "./NodeDetailsUI/OthersPanel.js";
import {PermissionsPanel} from "./NodeDetailsUI/PermissionsPanel.js";
import {TextPanel} from "./NodeDetailsUI/TextPanel.js";
import {QuoteInfoEditorUI} from "./NodeDetailsUI/AttachmentPanel/QuoteInfoEditorUI.js";
import {TagsPanel} from "./NodeUI/Panels/TagsPanel.js";
import {NodeChildLink} from "dm_common/Source/Store/db/nodeChildLinks/@NodeChildLink.js";

type Props = {
	baseData: MapNode,
	baseRevisionData: MapNodeRevision,
	baseLinkData: NodeChildLink,
	parent: MapNodeL3, forNew: boolean, forOldRevision?: boolean, enabled?: boolean,
	style?, onChange?: (newData: MapNode, newRevisionData: MapNodeRevision, newLinkData: NodeChildLink, component: NodeDetailsUI)=>void,
	// onSetError: (error: string)=>void,
	// validateNewData: (newData: MapNode, newRevisionData: MapNodeRevision)=>void,
};
type State = {newData: MapNode, newRevisionData: MapNodeRevision, newLinkData: NodeChildLink};
export type NodeDetailsUI_SharedProps = Props & State & {newDataAsL2, Change, SetState};

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

		const newDataAsL2 = AsNodeL2(newData, newRevisionData, null);

		const sharedProps: NodeDetailsUI_SharedProps = {...this.props, Change, newDataAsL2, ...this.state, SetState: this.SetState};
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
				{subpanel == DetailsPanel_Subpanel.text &&
					<TextPanel {...sharedProps}/>}
				{subpanel == DetailsPanel_Subpanel.attachment &&
					<AttachmentPanel {...sharedProps}/>}
				{subpanel == DetailsPanel_Subpanel.permissions &&
					<PermissionsPanel {...sharedProps}/>}
				{subpanel == DetailsPanel_Subpanel.others &&
					<OthersPanel {...sharedProps}/>}
			</Column>
		);
	}
	PostRender(source: RenderSource) {
		if (source != RenderSource.Mount) return;
		const {onChange} = this.props;
		if (onChange) onChange(this.GetNewData(), this.GetNewRevisionData(), this.GetNewLinkData(), this); // trigger on-change once, to check for validation-error
	}
	GetValidationError() {
		/*if (this.quoteEditor) {
			const quoteError = this.quoteEditor.GetValidationError();
			if (quoteError) return quoteError;
		}*/
		return GetErrorMessagesUnderElement(GetDOM(this))[0];
	}

	GetNewData() {
		const {newData} = this.state;
		return CloneWithPrototypes(newData) as MapNode;
	}
	GetNewRevisionData() {
		const {newRevisionData} = this.state;
		return CloneWithPrototypes(newRevisionData) as MapNodeRevision;
	}
	GetNewLinkData() {
		const {newLinkData} = this.state;
		return CloneWithPrototypes(newLinkData) as NodeChildLink;
	}
}