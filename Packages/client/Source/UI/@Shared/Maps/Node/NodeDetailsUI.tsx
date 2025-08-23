import {Clone, E, GetEntries, GetErrorMessagesUnderElement, CloneWithPrototypes} from "js-vextensions";
import {Column, Row, Select} from "react-vcomponents";
import {store} from "Store";
import {RunInAction} from "web-vcore";
import {DetailsPanel_Subpanel} from "Store/main/maps";
import {NodeL1, NodeL3, NodeRevision, AsNodeL1, AsNodeL2, NodeLink, GetAccessPolicy, DMap, NodeL2} from "dm_common";
import {AssertValidate} from "mobx-graphlink";
import React, {Ref, useEffect, useImperativeHandle, useReducer, useRef, useState} from "react";
import {OthersPanel} from "./NodeDetailsUI/OthersPanel.js";
import {PermissionsPanel} from "./NodeDetailsUI/PermissionsPanel.js";
import {TextPanel} from "./NodeDetailsUI/TextPanel.js";
import {AttachmentPanel} from "./NodeDetailsUI/AttachmentPanel.js";
import {SLMode_SFI} from "../../../@SL/SL.js";
import {observer_mgl} from "mobx-graphlink";

type Props = {
	map: DMap|n,
	parent: NodeL3|n,
	baseData: NodeL1,
	baseRevisionData: NodeRevision,
	baseLinkData: NodeLink|n,
	forNew: boolean,
	forOldRevision?: boolean,
	enabled?: boolean,
	style?: React.CSSProperties,
	onChange?: (newData: NodeL1, newRevisionData: NodeRevision, newLinkData: NodeLink, component: NodeDetailsUIElem)=>void,
	ref: Ref<NodeDetailsUIElem>,
};

type State = {
	newData: NodeL1,
	newRevisionData: NodeRevision,
	newLinkData: NodeLink
};

export type NodeDetailsUIElem = HTMLDivElement & {
	getValidationError: () => any,
	getNewData: () => NodeL1,
	getNewRevisionData: () => NodeRevision,
	getNewLinkData: () => NodeLink,

};

export type NodeDetailsUI_SharedProps = {
	newDataAsL2: NodeL2,
	Change,
	SetState
} & Props & State;

export const NodeDetailsUI = observer_mgl((props: Props)=>{
	const {enabled = true, ref, baseData, baseRevisionData, baseLinkData, forNew, style, onChange} = props;
	const [state, setState] = useState<State>({
		newData: AsNodeL1(Clone(baseData)),
		newRevisionData: Clone(baseRevisionData),
		newLinkData: Clone(baseLinkData),
	});

	const didTriggerOnChange = useRef(false);
	const internalRef = useRef<HTMLDivElement|n>(null);
	const [_,reRender] = useReducer(x=>x+1, 0);

	const getValidationError = ()=>{
		return GetErrorMessagesUnderElement(internalRef.current)[0];
	}

	const getNewData = (): NodeL1=>{
		AssertValidate("NodeL1", state.newData, "NodeDetailsUI returned map-node data that is invalid. Is the AsNodeL1() function up-to-date?"); // catch regressions
		return CloneWithPrototypes(state.newData) as NodeL1;
	}

	const getNewRevisionData = (): NodeRevision=>{
		return CloneWithPrototypes(state.newRevisionData) as NodeRevision;
	}

	const getNewLinkData = (): NodeLink=>{
		return CloneWithPrototypes(state.newLinkData) as NodeLink;
	}

	const modifyElem = (el: HTMLDivElement|n)=>{
		return el ? (Object.assign(el, {getValidationError, getNewRevisionData, getNewData, getNewLinkData}) as NodeDetailsUIElem) : null
	}

	const Change = (..._)=>{
		if (onChange) { onChange(getNewData(), getNewRevisionData(), getNewLinkData(), modifyElem(internalRef.current)!)}
		reRender()
	};

	useEffect(()=>{
		if (!state || didTriggerOnChange.current) return;
		didTriggerOnChange.current = true;

		// trigger on-change once, to check for validation-error
		if (onChange) onChange(getNewData(), getNewRevisionData(), getNewLinkData(), modifyElem(internalRef.current)!);

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state])

	useEffect(()=>{
		setState({
			// ensure no "extra props" are present on baseData (else the result returned will have extra props, which can cause issues)
            newData: AsNodeL1(Clone(baseData)),
            newRevisionData: Clone(baseRevisionData),
            newLinkData: Clone(baseLinkData),
		})

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [baseData])

	useImperativeHandle(ref, ()=>{
		return modifyElem(internalRef.current)!;
	});

	const policy = GetAccessPolicy(state?.newData.accessPolicy);
	if (policy == null) return null;
	const newDataAsL2 = AsNodeL2(state.newData, state.newRevisionData, policy);

	const sharedProps: NodeDetailsUI_SharedProps = {...props, Change, newDataAsL2, ...state, SetState: setState};
	const subPanel = store.main.maps.detailsPanel.subpanel;
	return (
		<Column style={E({padding: 5}, style)} ref={v=>{internalRef.current = v?.root}}>
			<Row mb={5}>
				<Select displayType="button bar"
					// only show permissions panel when first creating node (afterward, setting is changed in node's Others panel)
					options={GetEntries(DetailsPanel_Subpanel, "ui").filter(a=>{
						if (SLMode_SFI && a.value?.IsOneOf(DetailsPanel_Subpanel.permissions, DetailsPanel_Subpanel.others)) return false;
						return a.value != DetailsPanel_Subpanel.permissions || forNew;
					})}
					value={subPanel} onChange={val=>{
						RunInAction("NodeDetailsUI.subpanel.onChange", ()=>store.main.maps.detailsPanel.subpanel = val);
					}}/>
			</Row>
			{subPanel === DetailsPanel_Subpanel.text && <TextPanel {...sharedProps}/>}
			{subPanel === DetailsPanel_Subpanel.attachments && <AttachmentPanel {...sharedProps}/>}
			{subPanel === DetailsPanel_Subpanel.permissions && <PermissionsPanel {...sharedProps}/>}
			{subPanel === DetailsPanel_Subpanel.others && <OthersPanel {...sharedProps}/>}
		</Column>
	);
});
