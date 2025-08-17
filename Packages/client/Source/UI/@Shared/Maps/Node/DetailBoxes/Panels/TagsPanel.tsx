import {GetNodeLabelCounts, GetNodeTags, GetTagCompClassByTag, HasAdminPermissions, HasModPermissions, DMap, NodeL3, NodeTag, MeID, TagComp_Labels, TagComp_MirrorChildrenFromXToY, PERMISSIONS} from "dm_common";
import {Assert, Clone, E, GetEntries} from "js-vextensions";
import React, {useState} from "react";
import {VMenuItem, VMenuStub} from "react-vmenu";
import {store} from "Store";
import {TagsPanel_Subpanel} from "Store/main/maps";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel";
import {ShowAddTagDialog, TagDetailsUI} from "UI/Database/Tags/TagDetailsUI.js";
import {RunCommand_AddNodeTag, RunCommand_DeleteNodeTag, RunCommand_UpdateNodeTag} from "Utils/DB/Command";
import {liveSkin} from "Utils/Styles/SkinManager";
import {GetUpdates, HSLA, RunInAction_Set} from "web-vcore";
import {Button, Column, Row, Select, Text, TextInput} from "react-vcomponents";
import {ShowMessageBox} from "react-vmessagebox";
import {observer_mgl} from "mobx-graphlink";

export type TagsPanel_Props = {
	show: boolean,
	map?: DMap|n,
	node: NodeL3,
	path: string
};

export const TagsPanel = observer_mgl((props: TagsPanel_Props)=>{
	const {show, node} = props;
	const uiState = store.main.maps.tagsPanel;
	const tags = GetNodeTags(node.id);

	const labelCounts = GetNodeLabelCounts(tags);
	const labels = [...labelCounts.entries()]
		.OrderBy(a=>a[0]) // first order alphabetically
		.OrderByDescending(a=>a[1]) // then order by count (thus within a certain count-bucket, they are ordered alphabetically)
		.map(a=>a[0]);
	const myLabelsTag = tags.find(a=>a.creator == MeID() && a.labels != null);
	const myLabels = myLabelsTag?.labels!.labels ?? [];

	const [addLabelMode, setAddLabelMode] = useState(false);
	const [newLabelText, setNewLabelText] = useState("");

	const AddOwnLabel = (label: string)=>{
		if (myLabelsTag == null) {
			const tag = new NodeTag({
				labels: new TagComp_Labels({nodeX: node.id}),
				nodes: [node.id],
			});
			tag.labels!.labels = [label];
			RunCommand_AddNodeTag(tag);
		} else {
			const newLabelsComp = Clone(myLabelsTag.labels) as TagComp_Labels;
			newLabelsComp.labels.push(label);
			RunCommand_UpdateNodeTag({id: myLabelsTag!.id, updates: {labels: newLabelsComp}});
		}
	};
	const RemoveLabelInTag = (label: string, tag: NodeTag)=>{
		const newLabelsComp = Clone(tag.labels) as TagComp_Labels;
		newLabelsComp.labels.Remove(label);
		RunCommand_UpdateNodeTag({id: tag.id, updates: {labels: newLabelsComp}});
	};

	return (
		<Column style={{position: "relative", display: show ? null : "none"}}>
			<Row center mt={5}>
				<Select displayType="button bar" options={GetEntries(TagsPanel_Subpanel, "ui")} value={uiState.subpanel} onChange={val=>RunInAction_Set(()=>uiState.subpanel = val)}/>
			</Row>
			{uiState.subpanel == TagsPanel_Subpanel.basic &&
			<>
				<Row center mt={5}>
					<Text style={{fontWeight: "bold"}}>Labels:</Text>
					{!addLabelMode &&
					<Button ml={5} p="3px 7px" text="+" enabled={HasModPermissions(MeID())} onClick={()=>{
						setAddLabelMode(true);
					}}/>}
					{addLabelMode &&
					<>
						<TextInput ml={5} instant={true} value={newLabelText} onChange={val=>setNewLabelText(val)}/>
						<Button ml={5} p="3px 7px" text="Add" enabled={newLabelText.trim().length > 0} onClick={()=>{
							AddOwnLabel(newLabelText);
							setAddLabelMode(false);
							setNewLabelText("");
						}}/>
						<Button ml={5} p="3px 7px" text="Cancel" onClick={()=>{
							setAddLabelMode(false);
							setNewLabelText("");
						}}/>
					</>}
				</Row>
				<Row mt={5} style={{flexWrap: "wrap", gap: 5}}>
					{labels.map((label, index)=>{
						const labelSetForSelf = myLabels.includes(label);
						return (
							<Text key={index} /*ml={index == 0 ? 0 : 5} mt={5}*/ p="0 5px 3px"
									style={E(
										{display: "inline-block", background: HSLA(0, 0, 1, .3), borderRadius: 5, cursor: "pointer"},
										labelSetForSelf && {background: "rgba(100,200,100,.5)"},
									)}
									onClick={()=>{
										if (MeID() == null) return ShowSignInPopup();
										if (labelSetForSelf) {
											Assert(myLabelsTag != null);
											RemoveLabelInTag(label, myLabelsTag);
										} else {
											AddOwnLabel(label);
										}
									}}>
								{label}<sup>{labelCounts.get(label)}</sup>
								{HasAdminPermissions(MeID()) && // mods are technically able to remove whatever tags they want, but we only want to show this "shortcut" tool to admins
								<VMenuStub>
									<VMenuItem text="Remove all" style={liveSkin.Style_VMenuItem()}
										onClick={async e=>{
											if (e.button != 0) return;
											for (const tag of tags) {
												if (tag.labels?.labels?.includes(label)) {
													RemoveLabelInTag(label, tag);
												}
											}
										}}/>
								</VMenuStub>}
							</Text>
						);
					})}
				</Row>
			</>}
			{uiState.subpanel == TagsPanel_Subpanel.advanced &&
			<>
				<Row center mt={5}>
					<Text style={{fontWeight: "bold"}}>Tags:</Text>
					<Button ml={5} p="3px 7px" text="+" enabled={HasModPermissions(MeID())} onClick={()=>{
						ShowAddTagDialog({
							mirrorChildrenFromXToY: new TagComp_MirrorChildrenFromXToY({nodeY: node.id}),
							nodes: [node.id],
						} as Partial<NodeTag>);
					}}/>
				</Row>
				{tags.filter(a=>a.labels == null).map((tag, index)=>{
					return (
						<TagRow key={index} tag={tag} index={index} node={node}/>
					);
				})}
			</>}
		</Column>
	);
});

type TagRow_Props = {
	node: NodeL3,
	tag: NodeTag,
	index: number
};

const TagRow = observer_mgl((props: TagRow_Props)=>{
	const {node, tag} = props;
	const [newTag, setNewTag] = useState<NodeTag|n>(null);
	const effectiveTag = newTag ?? tag;

	let tempCommand_valid = true;
	let tempCommand_error: string | undefined;
	if (tempCommand_valid && !effectiveTag.nodes.Contains(node.id)) {
		tempCommand_valid = false;
		tempCommand_error = `
			The selected-node cannot be detached from a tag through the Tags panel.

			To proceed, select a different attached node${/*, use the Database->Tags page*/""}, or delete and recreate for the target node.
		`.AsMultiline(0);
	}

	const creatorOrMod = PERMISSIONS.NodeTag.Modify(MeID(), tag);
	const compClass = GetTagCompClassByTag(tag);

	return (
		<Column mt={5} style={{background: HSLA(0, 0, 0, .3), padding: 5, borderRadius: 5}}>
			<TagDetailsUI  baseData={tag} phase={creatorOrMod ? "edit" : "view"} onChange={val=>setNewTag(val)}/>
			{creatorOrMod &&
				<Row mt={5}>
					<Button text="Save" enabled={tempCommand_valid} title={tempCommand_error} onLeftClick={async()=>{
						await RunCommand_UpdateNodeTag({id: tag.id, updates: GetUpdates(tag, effectiveTag)});
					}}/>

					<Button ml="auto" text="Delete" onLeftClick={async()=>{
						ShowMessageBox({
							title: "Delete node tag", cancelButton: true,
							message: `
								Delete the node tag below?
								Type: ${compClass.displayName}
							`.AsMultiline(0),
							onOK: async()=>{
								await RunCommand_DeleteNodeTag({id: tag.id});
							},
						});
					}}/>
				</Row>}
		</Column>
	);
});
