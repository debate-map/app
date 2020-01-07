import {Clone, E, GetEntries, GetErrorMessagesUnderElement} from "js-vextensions";
import {runInAction} from "mobx";
import {Column, Row, Select} from "react-vcomponents";
import {BaseComponentPlus, GetDOM, RenderSource} from "react-vextensions";
import {store} from "Store";
import {GetAttachmentType} from "Store/firebase/nodeRevisions/@AttachmentType";
import {AsNodeL1, AsNodeL2} from "Store/firebase/nodes/$node";
import {Observer} from "vwebapp-framework";
import {DetailsPanel_Subpanel} from "Store/main/maps";
import {ChildEntry, MapNode, MapNodeL3} from "../../../../Store/firebase/nodes/@MapNode";
import {MapNodeRevision} from "../../../../Store/firebase/nodes/@MapNodeRevision";
import {AttachmentPanel} from "./NodeDetailsUI/AttachmentPanel";
import {OthersPanel} from "./NodeDetailsUI/OthersPanel";
import {PermissionsPanel} from "./NodeDetailsUI/PermissionsPanel";
import {TextPanel} from "./NodeDetailsUI/TextPanel";
import {QuoteInfoEditorUI} from "./NodeDetailsUI/AttachmentPanel/QuoteInfoEditorUI";

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

		const newDataAsL2 = AsNodeL2(newData, newRevisionData);

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
				{subpanel == DetailsPanel_Subpanel.Text &&
					<TextPanel {...sharedProps}/>}
				{subpanel == DetailsPanel_Subpanel.Attachment &&
					<AttachmentPanel {...sharedProps}/>}
				{subpanel == DetailsPanel_Subpanel.Permissions &&
					<PermissionsPanel {...sharedProps}/>}
				{subpanel == DetailsPanel_Subpanel.Others &&
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