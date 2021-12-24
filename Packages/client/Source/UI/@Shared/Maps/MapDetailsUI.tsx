import {AddMap, ChildLayout, ChildLayout_niceNames, GetAccessPolicy, GetUserHidden, IsUserCreatorOrMod, Map, Map_namePattern, MeID} from "dm_common";
import React from "react";
import {PolicyPicker} from "UI/Database/Policies/PolicyPicker.js";
import {Observer, TextPlus} from "web-vcore";
import {DEL, GetEntries, ToNumber} from "web-vcore/nm/js-vextensions.js";
import {GetAsync} from "web-vcore/nm/mobx-graphlink";
import {Button, CheckBox, Column, Pre, Row, RowLR, Select, Text, Spinner, TextInput} from "web-vcore/nm/react-vcomponents.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox";
import {GenericEntryInfoUI} from "../CommonPropUIs/GenericEntryInfoUI.js";
import {DetailsUI_Base} from "../DetailsUI_Base.js";
import {PermissionsPanel} from "./MapNode/NodeDetailsUI/PermissionsPanel.js";

@Observer
export class MapDetailsUI extends DetailsUI_Base<Map, MapDetailsUI> {
	render() {
		const {baseData, style, onChange} = this.props;
		const {newData} = this.state;
		const {Change, creating, enabled} = this.helpers;
		const creatorOrMod = IsUserCreatorOrMod(MeID(), newData);
		const accessPolicy = GetAccessPolicy(newData.accessPolicy);
		const nodeAccessPolicy = GetAccessPolicy(newData.nodeAccessPolicy);

		const splitAt = 180;
		const width = 600;
		return (
			<Column style={style}>
				{!creating &&
					<GenericEntryInfoUI id={baseData.id} creatorID={newData.creator} createdAt={newData.createdAt}/>}
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Pre>Name:</Pre>
					<TextInput
						pattern={Map_namePattern} required
						enabled={enabled} style={{width: "100%"}}
						value={newData.name} onChange={val=>Change(newData.name = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Pre>Note:</Pre>
					<TextInput enabled={enabled} style={{width: "100%"}}
						value={newData.note} onChange={val=>Change(newData.note = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Pre>Inline note:</Pre>
					<CheckBox enabled={enabled} style={{width: "100%"}}
						value={newData.noteInline ?? false} onChange={val=>Change(newData.noteInline = val)}/>
				</RowLR>
				{/*newData.type == MapType.private && !forNew && creatorOrMod &&
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Row center>
						<Pre>Visibility:</Pre>
						<InfoButton ml={5} text={`
							Visible: Shown publicly in the list of maps. (the private/public map-types relate to who can edit the map, not who can view)
							Unlisted: Hidden in map list (other than to map editors and mods), but still accessible through: 1) direct map link, 2) node searches, 3) reading raw db contents. (so not guarantee of privacy)
						`.AsMultiline(0)}/>
					</Row>
					<Select options={GetEntries(MapVisibility)} enabled={enabled} value={newData.visibility} onChange={val=>Change(newData.visibility = val)}/>
				</RowLR>*/}
				{!creating &&
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Pre>Expand depth (default):</Pre>
					<Spinner min={1} max={3} enabled={enabled}
						value={ToNumber(newData.defaultExpandDepth, 0)} onChange={val=>Change(newData.defaultExpandDepth = val)}/>
				</RowLR>}
				{/*!creating &&
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<TextPlus info="Whether to show the 'freeform' box under claim/argument nodes, even when they have no freeform children yet.">Show freeform (default):</TextPlus>
					<CheckBox enabled={enabled} value={newData.extras.defaultShowFreeform ?? false} onChange={val=>Change(newData.extras.defaultShowFreeform = val)}/>
				</RowLR>*/}

				{!creating &&
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<TextPlus>Node child-layouts:</TextPlus>
					<TextPlus info="Whether nodes are allowed to be displayed with the flat (or otherwise non-standard) layout rather than the default layout.">Allow special:</TextPlus>
					<CheckBox ml={5} enabled={enabled} value={newData.extras.allowSpecialChildLayouts ?? false} onChange={val=>Change(newData.extras.allowSpecialChildLayouts = val)}/>
					{/*<Text ml={5}>Set to preset:</Text>
					<Select options={[{name: "", value: null}, "Society Library standard"]} value={null} onChange={val=>{}}/>*/}
					{newData.extras.allowSpecialChildLayouts &&
					<>
						<TextPlus ml={10} info={`
							The child-layout used for nodes that do not have an override value set.

							Options:
							* Unchanged: Don't change the child-layout from the global default and/or the node-specific override layout.
							* Grouped: truth:group_always, relevance:group_always freeform:group_always
							* Debate Map standard: truth:group_always, relevance:group_always, freeform:group_whenNonEmpty
							* Society Library standard: truth:group_always, relevance:group_whenNonEmpty, freeform:flat
							* Flat: truth:flat, relevance:group_whenNonEmpty, freeform:flat
						`.AsMultiline(0)}>Default:</TextPlus>
						<Select ml={5} options={[{name: "Unchanged", value: null} as any, ...GetEntries(ChildLayout, a=>ChildLayout_niceNames[a])]}
							value={newData.extras.defaultChildLayout} onChange={val=>Change(newData.extras.defaultChildLayout = val)}/>

						{/*<Row>
							<TextPlus ml={10} info="The child-layout used for nodes that do not have an override value set.">Truth:</TextPlus>
							<Select ml={5} options={[{name: "Unchanged", value: null} as any, ...GetEntries(ChildLayout, "ui")]} value={newData.extras.defaultChildLayout} onChange={val=>Change(newData.extras.defaultChildLayout = val)}/>
						</Row>
						<Row>
							<TextPlus ml={10} info="The child-layout used for nodes that do not have an override value set.">Relevance:</TextPlus>
							<Select ml={5} options={[{name: "Unchanged", value: null} as any, ...GetEntries(ChildLayout, "ui")]} value={newData.extras.defaultChildLayout} onChange={val=>Change(newData.extras.defaultChildLayout = val)}/>
						</Row>
						<Row>
							<TextPlus ml={10} info="The child-layout used for nodes that do not have an override value set.">Freeform:</TextPlus>
							<Select ml={5} options={[{name: "Unchanged", value: null} as any, ...GetEntries(ChildLayout, "ui")]} value={newData.extras.defaultChildLayout} onChange={val=>Change(newData.extras.defaultChildLayout = val)}/>
						</Row>*/}
					</>}
				</RowLR>}

				{/*!forNew &&
				<RowLR mt={5} splitAt={splitAt}>
					<Pre>Default timeline:</Pre>
					<TextInput enabled={enabled} value={newData.defaultTimelineID} onChange={val=>Change(newData.defaultTimelineID = val)}/>
				</RowLR>*/}
				{/* <RowLR mt={5} splitAt={splitAt} style={{ width }}>
					<Row center>
						<Pre>Allow public nodes:</Pre>
						<InfoButton ml={5} text=""/>
					</Row>
					<CheckBox enabled={enabled} value={newData.allowPublicNodes} onChange={(val) => Change(newData.allowPublicNodes = val)}/>
				</RowLR> */}
				{/*! forNew &&
					<RowLR mt={5} splitAt={splitAt} style={{width}}>
						<Pre>Root-node ID: </Pre>
						<Spinner enabled={enabled} style={{width: "100%"}}
							value={newData.rootNode} onChange={val=>Change(newData.rootNode = val)}/>
					</RowLR> */}
				<RowLR mt={5} splitAt={splitAt}>
					<Pre>Access policy: </Pre>
					<PolicyPicker value={newData.accessPolicy} onChange={val=>Change(newData.accessPolicy = val)}>
						<Button enabled={enabled} text={accessPolicy ? `${accessPolicy.name} (id: ${accessPolicy.id})` : "(click to select policy)"} style={{width: "100%"}}/>
					</PolicyPicker>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt}>
					<Pre>Node access policy: </Pre>
					<PolicyPicker value={newData.nodeAccessPolicy} onChange={val=>Change(newData.nodeAccessPolicy = val)}>
						<Button enabled={enabled} text={nodeAccessPolicy ? `${nodeAccessPolicy.name} (id: ${nodeAccessPolicy.id})` : "(click to select policy)"} style={{width: "100%"}}/>
					</PolicyPicker>
				</RowLR>
			</Column>
		);
	}
}

export async function ShowAddMapDialog() {
	const prep = await GetAsync(()=>{
		return {accessPolicy: GetUserHidden(MeID())?.lastAccessPolicy};
	});

	let newMap = new Map({
		accessPolicy: prep.accessPolicy,
		name: "",
		editors: [MeID.NN()],
	});

	let error = null;
	const Change = (..._)=>boxController.UpdateUI();
	const boxController = ShowMessageBox({
		title: "Add map", cancelButton: true,
		message: ()=>{
			boxController.options.okButtonProps = {enabled: error == null};
			return (
				<Column style={{padding: "10px 0", width: 600}}>
					<MapDetailsUI baseData={newMap} phase="create" onChange={(val, _, ui)=>Change(newMap = val, error = ui.GetValidationError())}/>
					{error && error != "Please fill out this field." && <Row mt={5} style={{color: "rgba(200,70,70,1)"}}>{error}</Row>}
				</Column>
			);
		},
		onOK: ()=>{
			new AddMap({map: newMap}).RunOnServer();
		},
	});
}