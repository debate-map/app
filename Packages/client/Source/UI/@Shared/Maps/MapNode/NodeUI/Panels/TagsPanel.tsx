import {Div, Column, Row, Button, TextInput, DropDown, DropDownTrigger, DropDownContent, Text} from "web-vcore/nm/react-vcomponents";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions";
import {InfoButton, Observer, GetUpdates, HSLA} from "web-vcore";
import {TermDefinitionPanel} from "./DefinitionsPanel";
import {Map} from "dm_common";
import {MapNodeL3} from "dm_common";
import {GetNodeTags} from "dm_common";
import {HasModPermissions, IsUserCreatorOrMod} from "dm_common";
import {MeID} from "dm_common";
import {ShowAddTagDialog, TagDetailsUI} from "UI/Database/Tags/TagDetailsUI";
import {TagComp_MirrorChildrenFromXToY, MapNodeTag, GetTagCompClassByTag} from "dm_common";
import {UpdateNodeTag} from "dm_common";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox";
import {DeleteNodeTag} from "dm_common";

@Observer
export class TagsPanel extends BaseComponentPlus({} as {show: boolean, map?: Map, node: MapNodeL3, path: string}, {}) {
	render() {
		const {show, node} = this.props;
		const tags = GetNodeTags(node.id);
		return (
			<Column style={{position: "relative", display: show ? null : "none"}}>
				<Row center mt={5}>
					<Text style={{fontWeight: "bold"}}>Tags:</Text>
					<Button ml={5} p="3px 7px" text="+" enabled={HasModPermissions(MeID())} onClick={()=>{
						ShowAddTagDialog({
							mirrorChildrenFromXToY: new TagComp_MirrorChildrenFromXToY({nodeY: node.id}),
							nodes: [node.id],
						} as Partial<MapNodeTag>);
					}}/>
				</Row>
				{tags.map((tag, index)=>{
					return (
						<TagRow key={index} tag={tag} index={index} node={node}/>
					);
				})}
			</Column>
		);
	}
}

@Observer
class TagRow extends BaseComponentPlus({} as {node: MapNodeL3, tag: MapNodeTag, index: number}, {newTag: null as MapNodeTag}) {
	//detailsUI: TagDetailsUI;
	render() {
		const {tag, index, node} = this.props;
		//const {newTag} = this.state;
		const newTag = this.state.newTag ?? tag;
		const comp = tag.mirrorChildrenFromXToY;
		const compClass = GetTagCompClassByTag(tag);

		const tempCommand = new UpdateNodeTag({id: tag.id, updates: GetUpdates(tag, newTag)});
		let tempCommand_valid = tempCommand.Validate_Safe() == null;
		let tempCommand_error = tempCommand.validateError;
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
				<TagDetailsUI /*ref={c=>this.detailsUI = c}*/ baseData={tag} forNew={false} enabled={creatorOrMod} onChange={val=>this.SetState({newTag: val})}/>
				{creatorOrMod &&
					<Row mt={5}>
						<Button text="Save" enabled={tempCommand_valid} title={tempCommand_error} onLeftClick={async()=>{
							await tempCommand.Run();
						}}/>
						<Button ml="auto" text="Delete" onLeftClick={async()=>{
							ShowMessageBox({
								title: "Delete node tag", cancelButton: true,
								message: `
									Delete the node tag below?

									Type: ${compClass.displayName}
								`.AsMultiline(0),
								onOK: async()=>{
									await new DeleteNodeTag({id: tag.id}).Run();
								},
							});
						}}/>
					</Row>}
			</Column>
		);
	}
}