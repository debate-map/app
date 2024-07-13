import {Clone, E, GetEntries, GetErrorMessagesUnderElement, CloneWithPrototypes, Assert} from "js-vextensions";
import {runInAction} from "mobx";
import {Column, Row, Select} from "react-vcomponents";
import {BaseComponentPlus, GetDOM, RenderSource} from "react-vextensions";
import {store} from "Store";
import {Observer, RunInAction} from "web-vcore";
import {DetailsPanel_Subpanel} from "Store/main/maps";
import {NodeL1, NodeL3, NodeRevision, AsNodeL1, AsNodeL2, GetAttachmentType_Node, NodeLink, GetAccessPolicy, Map, NodeL2} from "dm_common";
import {AssertValidate, Validate} from "mobx-graphlink";
import React from "react";
import {OthersPanel} from "./NodeDetailsUI/OthersPanel.js";
import {PermissionsPanel} from "./NodeDetailsUI/PermissionsPanel.js";
import {TextPanel} from "./NodeDetailsUI/TextPanel.js";
import {QuoteInfoEditorUI} from "../../Attachments/AttachmentPanel/QuoteInfoEditorUI.js";
import {TagsPanel} from "./DetailBoxes/Panels/TagsPanel.js";
import {AttachmentPanel} from "./NodeDetailsUI/AttachmentPanel.js";
import {SLMode_SFI} from "../../../@SL/SL.js";

type Props = {
	map: Map|n, parent: NodeL3|n,
	baseData: NodeL1,
	baseRevisionData: NodeRevision,
	baseLinkData: NodeLink|n,
	forNew: boolean, forOldRevision?: boolean, enabled?: boolean,
	style?, onChange?: (newData: NodeL1, newRevisionData: NodeRevision, newLinkData: NodeLink, component: NodeDetailsUI)=>void,
	// onSetError: (error: string)=>void,
	// validateNewData: (newData: NodeL1, newRevisionData: NodeRevision)=>void,
};
type State = {newData: NodeL1, newRevisionData: NodeRevision, newLinkData: NodeLink};
export type NodeDetailsUI_SharedProps = Props & State & {newDataAsL2: NodeL2, Change, SetState};

@Observer
export class NodeDetailsUI extends BaseComponentPlus({enabled: true} as Props, {} as State) {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) { // if base-data changed
			this.SetState({
				newData: AsNodeL1(Clone(props.baseData)), // ensure no "extra props" are present on baseData (else the result returned will have extra props, which can cause issues)
				newRevisionData: Clone(props.baseRevisionData),
				newLinkData: Clone(props.baseLinkData),
			});
		}
	}

	render() {
		const {baseData, parent, forNew, forOldRevision, enabled, style, onChange} = this.props;
		const {newData, newLinkData, newRevisionData} = this.state;
		const Change = (..._)=>{
			if (onChange) { onChange(this.GetNewData(), this.GetNewRevisionData(), this.GetNewLinkData(), this); }
			this.Update();
		};

		const policy = GetAccessPolicy(newData.accessPolicy);
		if (policy == null) return null;
		const newDataAsL2 = AsNodeL2(newData, newRevisionData, policy);

		const sharedProps: NodeDetailsUI_SharedProps = {...this.props, Change, newDataAsL2, ...this.state, SetState: this.SetState};
		const attachmentType = GetAttachmentType_Node(newDataAsL2);

		const splitAt = 170;
		const subpanel = store.main.maps.detailsPanel.subpanel;
		return (
			<Column style={E({padding: 5}, style)}>
				<Row mb={5}>
					<Select displayType="button bar"
						// only show permissions panel when first creating node (afterward, setting is changed in node's Others panel)
						options={GetEntries(DetailsPanel_Subpanel, "ui").filter(a=>{
							if (SLMode_SFI && a.value?.IsOneOf(DetailsPanel_Subpanel.permissions, DetailsPanel_Subpanel.others)) return false;
							return a.value != DetailsPanel_Subpanel.permissions || forNew;
						})}
						value={subpanel} onChange={val=>{
							RunInAction("NodeDetailsUI.subpanel.onChange", ()=>store.main.maps.detailsPanel.subpanel = val);
						}}/>
				</Row>
				{subpanel == DetailsPanel_Subpanel.text &&
					<TextPanel {...sharedProps}/>}
				{subpanel == DetailsPanel_Subpanel.attachments &&
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
		//Assert(newData["policy"] == null); // catch regressions
		AssertValidate("NodeL1", newData, "NodeDetailsUI returned map-node data that is invalid. Is the AsNodeL1() function up-to-date?"); // catch regressions
		return CloneWithPrototypes(newData) as NodeL1;
	}
	GetNewRevisionData() {
		const {newRevisionData} = this.state;
		return CloneWithPrototypes(newRevisionData) as NodeRevision;
	}
	GetNewLinkData() {
		const {newLinkData} = this.state;
		return CloneWithPrototypes(newLinkData) as NodeLink;
	}
}