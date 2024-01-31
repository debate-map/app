import {AddMap, ChildLayout, ChildLayout_niceNames, ChildLayout_optionsStr, GetAccessPolicy, GetUserHidden, IsUserCreatorOrMod, Map, MeID, ChildOrdering, ChildOrdering_infoText, ToolbarItem, GetFinalAccessPolicyForNewEntry} from "dm_common";
import React from "react";
import {PolicyPicker, PolicyPicker_Button} from "UI/Database/Policies/PolicyPicker.js";
import {RunCommand_AddMap} from "Utils/DB/Command.js";
import {Observer, TextPlus} from "web-vcore";
import {DEL, GetEntries, ToNumber} from "web-vcore/nm/js-vextensions.js";
import {GetAsync, RunInAction} from "web-vcore/nm/mobx-graphlink";
import {Button, CheckBox, Column, Pre, Row, RowLR, Select, Text, Spinner, TextInput} from "web-vcore/nm/react-vcomponents.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox";
import {store} from "Store/index.js";
import {GenericEntryInfoUI} from "../CommonPropUIs/GenericEntryInfoUI.js";
import {DetailsUI_Base} from "../DetailsUI_Base.js";
import {PermissionsPanel} from "./Node/NodeDetailsUI/PermissionsPanel.js";

@Observer
export class MapDetailsUI extends DetailsUI_Base<Map, MapDetailsUI> {
	render() {
		const {baseData, style, onChange} = this.props;
		const {newData} = this.state;
		const {Change, creating, enabled} = this.helpers;
		const creatorOrMod = IsUserCreatorOrMod(MeID(), newData);
		const accessPolicy = GetAccessPolicy(newData.accessPolicy);
		const nodeAccessPolicy = GetAccessPolicy(newData.nodeAccessPolicy);

		const splitAt = 160;
		const width = 600;
		return (
			<Column style={style}>
				{!creating &&
					<GenericEntryInfoUI id={baseData.id} creatorID={newData.creator} createdAt={newData.createdAt}/>}
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Pre>Name:</Pre>
					<TextInput required enabled={enabled} style={{width: "100%"}}
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
				<RowLR mt={5} splitAt={splitAt}>
					<Pre>Access policy: </Pre>
					<PolicyPicker value={newData.accessPolicy} onChange={val=>Change(newData.accessPolicy = val)}>
						{text=><Button enabled={enabled} text={text} style={{width: "100%"}}/>}
					</PolicyPicker>
				</RowLR>

				<Column mt={10}>
					<Row style={{fontWeight: "bold"}}>Node defaults</Row>
					{!creating &&
					<RowLR mt={5} splitAt={splitAt} style={{width}}>
						<Pre>Expand depth:</Pre>
						<Spinner min={1} max={3} enabled={enabled}
							value={ToNumber(newData.defaultExpandDepth, 0)} onChange={val=>Change(newData.defaultExpandDepth = val)}/>
					</RowLR>}

					{!creating &&
					<RowLR mt={5} splitAt={splitAt} style={{width}}>
						<TextPlus>Child layout:</TextPlus>
						<TextPlus info={`Whether nodes are allowed to be displayed with layouts other than "Debate Map standard".`}>Allow special:</TextPlus>
						<CheckBox ml={5} enabled={enabled} value={newData.extras.allowSpecialChildLayouts ?? false} onChange={val=>Change(newData.extras.allowSpecialChildLayouts = val)}/>
						{newData.extras.allowSpecialChildLayouts &&
						<>
							<TextPlus ml={10} info={`
								Presets tweaking the way nodes are displayed in this map. (for nodes that do not have an override value set)

								${ChildLayout_optionsStr}
							`.AsMultiline(0)}>Default:</TextPlus>
							<Select ml={5} options={[{name: "Unchanged", value: null} as any, ...GetEntries(ChildLayout, a=>ChildLayout_niceNames[a])]}
								value={newData.extras.defaultChildLayout} onChange={val=>Change(newData.extras.defaultChildLayout = val)}/>
						</>}
					</RowLR>}

					{!creating &&
					<RowLR mt={5} splitAt={splitAt} style={{width}}>
						<TextPlus info={ChildOrdering_infoText}>Child ordering:</TextPlus>
						<Select enabled={enabled} options={[{name: "Unchanged", value: null} as any, ...GetEntries(ChildOrdering, "ui")]}
							value={newData.extras.defaultChildOrdering} onChange={val=>Change(newData.extras.defaultChildOrdering = val)}/>
					</RowLR>}

					<RowLR mt={5} splitAt={splitAt} style={{width}}>
						<Pre>Toolbar:</Pre>
						<Text>Show:</Text>
						<CheckBox ml={5} enabled={enabled} value={newData.extras.defaultNodeToolbarEnabled ?? true} onChange={val=>Change(newData.extras.defaultNodeToolbarEnabled = val)}/>
						<TextPlus ml={10} info={`
							* If no items are enabled, the default toolbar-items will try to be shown. (prefix, truth, relevance, phrasings)
							* For an item to be shown, it still must be valid for the given node.
							* The "Prefix" entry is only applicable in SL mode/layout. (for left-anchored prefix-text extractions)
						`.AsMultiline(0)}>Items:</TextPlus>
						{(()=>{
							const setToolbarItemEnabled = (item_panel: string, new_enabled: boolean)=>{
								const items_order: ToolbarItem[] = [{panel: "truth"}, {panel: "relevance"}, {panel: "tags"}, {panel: "phrasings"}];

								let new_items: ToolbarItem[] = newData.extras.toolbarItems ?? [];
								// first, remove any entries for the given panel (ensuring no duplicates)
								new_items = new_items.filter(a=>a.panel != item_panel);
								// then, if enabling that panel, add an entry for it
								if (new_enabled) {
									new_items.push({panel: item_panel});
								}
								// then ensure the ordering is correct
								new_items = new_items.OrderBy(a=>items_order.findIndex(b=>b.panel == a.panel));
								Change(newData.extras.toolbarItems = new_items);
							};
							return (
								<Row style={{fontSize: 12}}>
									<CheckBox ml={5} text="Prefix" enabled={enabled} value={newData.extras.toolbarItems?.Any(a=>a.panel == "prefix") ?? false} onChange={val=>setToolbarItemEnabled("prefix", val)}/>
									<CheckBox ml={5} text="Agree." enabled={enabled} value={newData.extras.toolbarItems?.Any(a=>a.panel == "truth") ?? false} onChange={val=>setToolbarItemEnabled("truth", val)}/>
									<CheckBox ml={5} text="Relev." enabled={enabled} value={newData.extras.toolbarItems?.Any(a=>a.panel == "relevance") ?? false} onChange={val=>setToolbarItemEnabled("relevance", val)}/>
									<CheckBox ml={5} text="Tags" enabled={enabled} value={newData.extras.toolbarItems?.Any(a=>a.panel == "tags") ?? false} onChange={val=>setToolbarItemEnabled("tags", val)}/>
									<CheckBox ml={5} text="Phrasings" enabled={enabled} value={newData.extras.toolbarItems?.Any(a=>a.panel == "phrasings") ?? false} onChange={val=>setToolbarItemEnabled("phrasings", val)}/>
								</Row>
							);
						})()}
					</RowLR>

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
						<TextPlus info="Note that this only applies for new nodes created in this map. (ie. if you change this setting, you must manually update the access-policies of existing nodes)">Node access policy:</TextPlus>
						<PolicyPicker value={newData.nodeAccessPolicy} onChange={val=>Change(newData.nodeAccessPolicy = val)}>
							<Button enabled={enabled} text={nodeAccessPolicy ? `${nodeAccessPolicy.name} (id: ${nodeAccessPolicy.id})` : "(click to select policy)"} style={{width: "100%"}}/>
						</PolicyPicker>
					</RowLR>
				</Column>
			</Column>
		);
	}
}

export async function ShowAddMapDialog(openMapAfterCreation = true) {
	const prep = await GetAsync(()=>{
		return {accessPolicy: GetFinalAccessPolicyForNewEntry(null, null, "maps")};
	});

	let newMap = new Map({
		accessPolicy: prep.accessPolicy.id,
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
		onOK: async()=>{
			const result = await RunCommand_AddMap(newMap);
			RunInAction("ShowAddMapDialog.onOK", ()=>{
				store.main.debates.selectedMapID = result.id;
			});
		},
	});
}