import {AddNodeTag, DeleteNodeTag, GetNodeLabelCounts, GetNodeTags, GetTagCompClassByTag, HasAdminPermissions, HasModPermissions, IsUserCreatorOrMod, Map, MapNodeL3, MapNodeTag, MeID, TagComp_Labels, TagComp_MirrorChildrenFromXToY, UpdateNodeTag} from "dm_common";
import {Assert, Clone, E, emptyArray, GetEntries, GetValues} from "js-vextensions";
import React, {useState} from "react";
import {VMenuItem, VMenuStub} from "react-vmenu";
import {store} from "Store";
import {TagsPanel_Subpanel} from "Store/main/maps";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel";
import {ShowAddTagDialog, TagDetailsUI} from "UI/Database/Tags/TagDetailsUI.js";
import {styles} from "Utils/UI/GlobalStyles";
import {GetUpdates, HSLA, Observer, RunInAction_Set} from "web-vcore";
import {Button, Column, Row, Select, Text, TextInput} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";

@Observer
export class TagsPanel extends BaseComponentPlus({} as {show: boolean, map?: Map|n, node: MapNodeL3, path: string}, {}) {
	render() {
		const {show, node} = this.props;
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
				const tag = new MapNodeTag({
					labels: new TagComp_Labels({nodeX: node.id}),
					nodes: [node.id],
				});
				tag.labels!.labels = [label];
				new AddNodeTag({tag}).RunOnServer();
			} else {
				const newLabelsComp = Clone(myLabelsTag.labels) as TagComp_Labels;
				newLabelsComp.labels.push(label);
				new UpdateNodeTag({
					id: myLabelsTag!.id,
					updates: {labels: newLabelsComp},
				}).RunOnServer();
			}
		};
		const RemoveLabelInTag = (label: string, tag: MapNodeTag)=>{
			const newLabelsComp = Clone(tag.labels) as TagComp_Labels;
			newLabelsComp.labels.Remove(label);
			new UpdateNodeTag({
				id: tag.id,
				updates: {labels: newLabelsComp},
			}).RunOnServer();
		};

		return (
			<Column style={{position: "relative", display: show ? null : "none"}}>
				<Row center mt={5}>
					<Select displayType="button bar" options={GetEntries(TagsPanel_Subpanel, "ui")} value={uiState.subpanel} onChange={val=>RunInAction_Set(this, ()=>uiState.subpanel = val)}/>
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
										<VMenuItem text="Remove all" style={styles.vMenuItem}
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
							} as Partial<MapNodeTag>);
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
	}
}

@Observer
class TagRow extends BaseComponentPlus({} as {node: MapNodeL3, tag: MapNodeTag, index: number}, {newTag: null as MapNodeTag|n}) {
	//detailsUI: TagDetailsUI;
	render() {
		const {tag, index, node} = this.props;
		//const {newTag} = this.state;
		const newTag = this.state.newTag ?? tag;
		const comp = tag.mirrorChildrenFromXToY;
		const compClass = GetTagCompClassByTag(tag);

		const tempCommand = new UpdateNodeTag({id: tag.id, updates: GetUpdates(tag, newTag)});
		let tempCommand_valid = tempCommand.Validate_Safe() == null;
		let tempCommand_error = tempCommand.ValidateErrorStr;
		if (tempCommand_valid && !newTag.nodes.Contains(node.id)) {
			tempCommand_valid = false;
			tempCommand_error = `
				The selected-node cannot be detached from a tag through the Tags panel.

				To proceed, select a different attached node${/*, use the Database->Tags page*/""}, or delete and recreate for the target node.
			`.AsMultiline(0);
		}

		const creatorOrMod = IsUserCreatorOrMod(MeID(), tag);
		return (
			<Column mt={5} style={{background: HSLA(0, 0, 0, .3), padding: 5, borderRadius: 5}}>
				{/*<Text>Type: {compClass.displayName}</Text>*/}
				<TagDetailsUI /*ref={c=>this.detailsUI = c}*/ baseData={tag} phase={creatorOrMod ? "edit" : "view"} onChange={val=>this.SetState({newTag: val})}/>
				{creatorOrMod &&
					<Row mt={5}>
						<Button text="Save" enabled={tempCommand_valid} title={tempCommand_error} onLeftClick={async()=>{
							await tempCommand.RunOnServer();
						}}/>
						<Button ml="auto" text="Delete" onLeftClick={async()=>{
							ShowMessageBox({
								title: "Delete node tag", cancelButton: true,
								message: `
									Delete the node tag below?

									Type: ${compClass.displayName}
								`.AsMultiline(0),
								onOK: async()=>{
									await new DeleteNodeTag({id: tag.id}).RunOnServer();
								},
							});
						}}/>
					</Row>}
			</Column>
		);
	}
}