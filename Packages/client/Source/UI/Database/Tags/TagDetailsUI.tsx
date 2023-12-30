import {Clone, E, DelIfFalsy, CloneWithPrototypes} from "web-vcore/nm/js-vextensions.js";
import {Column, Pre, RowLR, Select, Text, Row, TextInput, CheckBox, Button} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {BoxController, ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {GenericEntryInfoUI} from "UI/@Shared/CommonPropUIs/GenericEntryInfoUI.js";
import {ES, InfoButton, Observer, observer_simple} from "web-vcore";
import {Validate, observer_mgl} from "web-vcore/nm/mobx-graphlink.js";
import {GetNodeL2, AsNodeL3, GetNodeDisplayText, NodeType, AddNodeTag, NodeTag, TagComp_Class, GetTagCompClassByTag, TagComp_classes, TagComp_MirrorChildrenFromXToY, TagComp_XIsExtendedByY, TagComp_MutuallyExclusiveGroup, TagComp_RestrictMirroringOfX, TagComp, CalculateNodeIDsForTagComp, TagComp_CloneHistory} from "dm_common";
import {GetNodeColor} from "Store/db_ext/nodes";
import {DetailsUI_Base, DetailsUI_Base_Props, DetailsUI_Base_State} from "UI/@Shared/DetailsUI_Base";
import {observer} from "web-vcore/nm/mobx-react";
import {RunCommand_AddNodeTag} from "Utils/DB/Command";

export type TagDetailsUI_SharedProps = DetailsUI_Base_Props<NodeTag, TagDetailsUI> & DetailsUI_Base_State<NodeTag> & {compClass: TagComp_Class, splitAt, Change, enabled};
export class TagDetailsUI extends DetailsUI_Base<NodeTag, TagDetailsUI> {
	render() {
		const {baseData, style} = this.props;
		const {newData} = this.state;
		const {Change, creating, enabled} = this.helpers;
		const compClass = GetTagCompClassByTag(newData);

		//const splitAt = compClass == TagComp_XIsExtendedByY ? 140 : 70;
		const splitAt = 70;
		const sharedProps: TagDetailsUI_SharedProps = E(this.props, this.state, {compClass, splitAt, Change, enabled});
		return (
			<Column style={style}>
				{!creating &&
					<GenericEntryInfoUI id={baseData.id} creatorID={newData.creator} createdAt={newData.createdAt} singleLine={true}/>}
				<RowLR mt={5} mb={5} splitAt={splitAt} style={{width: "100%"}}>
					<Pre>Type: </Pre>
					<Select options={TagComp_classes.filter(a=>a.key != "labels").map(a=>({name: a.displayName, value: a}))}
						enabled={enabled} style={ES({flex: 1})}
						value={compClass}
						onChange={(newCompClass: TagComp_Class)=>{
							delete newData[compClass.key];
							newData[newCompClass.key] = new newCompClass();
							Change();
						}}/>
					<InfoButton ml={5} text={compClass.description}/>
				</RowLR>
				{/*compClass == TagComp_Labels &&
					<TagCompUI_Labels {...sharedProps}/>*/}
				{compClass == TagComp_MirrorChildrenFromXToY &&
					<TagCompUI_MirrorChildrenFromXToY {...sharedProps}/>}
				{compClass == TagComp_XIsExtendedByY &&
					<TagCompUI_XIsExtendedByY {...sharedProps}/>}
				{compClass == TagComp_MutuallyExclusiveGroup &&
					<TagCompUI_MutuallyExclusiveGroup {...sharedProps}/>}
				{compClass == TagComp_RestrictMirroringOfX &&
					<TagCompUI_RestrictMirroringOfX {...sharedProps}/>}
				{compClass == TagComp_CloneHistory &&
					<TagCompUI_CloneHistory {...sharedProps}/>}
			</Column>
		);
	}
}

class TagCompUI_MirrorChildrenFromXToY extends BaseComponentPlus({} as TagDetailsUI_SharedProps, {}) {
	render() {
		const {newData, enabled, splitAt, Change} = this.props;
		const comp = newData.mirrorChildrenFromXToY!;
		return (
			<>
				<NodeSlotRow {...this.props} comp={comp} nodeKey="nodeX" label="Node X" mt={0}/>
				<NodeSlotRow {...this.props} comp={comp} nodeKey="nodeY" label="Node Y"/>
				<Row mt={5}>
					<Text>Mirror from X:</Text>
					<CheckBox ml={10} text="Supporting arguments" value={comp.mirrorSupporting} enabled={enabled} onChange={val=>Change(comp.mirrorSupporting = val)}/>
					<CheckBox ml={10} text="Opposing arguments" value={comp.mirrorOpposing} enabled={enabled} onChange={val=>Change(comp.mirrorOpposing = val)}/>
				</Row>
				<CheckBox mt={5} text="Reverse argument polarities" value={comp.reversePolarities} enabled={enabled} onChange={val=>Change(comp.reversePolarities = val)}/>
				<CheckBox mt={5} text="Disable Y direct children" value={comp.disableDirectChildren} enabled={enabled} onChange={val=>Change(comp.disableDirectChildren = val)}/>
			</>
		);
	}
}

class TagCompUI_XIsExtendedByY extends BaseComponentPlus({} as TagDetailsUI_SharedProps, {}) {
	render() {
		const {newData, enabled, splitAt, Change} = this.props;
		const comp = newData.xIsExtendedByY!;
		return (
			<>
				<NodeSlotRow {...this.props} comp={comp} nodeKey="nodeX" label="Node X" mt={0}/>
				<NodeSlotRow {...this.props} comp={comp} nodeKey="nodeY" label="Node Y"/>
			</>
		);
	}
}

class TagCompUI_MutuallyExclusiveGroup extends BaseComponentPlus({} as TagDetailsUI_SharedProps, {}) {
	render() {
		const {newData, enabled, splitAt, Change} = this.props;
		const comp = newData.mutuallyExclusiveGroup!;
		return (
			<>
				<Row>
					<Text>Nodes in group:</Text>
					<Button ml={5} p="3px 7px" text="+" enabled={enabled} onClick={()=>{
						comp.nodes.push("");
						Change();
					}}/>
				</Row>
				{comp.nodes.map((nodeID, index)=>{
					return <NodeInArrayRow key={index} {...this.props} comp={comp} nodeArrayKey="nodes" nodeEntry={nodeID} nodeEntryIndex={index}/>;
				})}
				<Row center mt={5}>
					<CheckBox text="Mirror X pros as Y cons" value={comp.mirrorXProsAsYCons} enabled={enabled} onChange={val=>Change(comp.mirrorXProsAsYCons = val)}/>
					<InfoButton ml={5} text="Makes-so each node's pro-args are mirrored as con-args of the others."/>
				</Row>
			</>
		);
	}
}

class TagCompUI_RestrictMirroringOfX extends BaseComponentPlus({} as TagDetailsUI_SharedProps, {}) {
	render() {
		const {newData, enabled, splitAt, Change} = this.props;
		const comp = newData.restrictMirroringOfX!;
		return (
			<>
				<NodeSlotRow {...this.props} comp={comp} nodeKey="nodeX" label="Node X" mt={0}/>
				<CheckBox mt={5} text="Blacklist all mirror-parents" value={comp.blacklistAllMirrorParents} enabled={enabled} onChange={val=>Change(comp.blacklistAllMirrorParents = val)}/>
				<Row mt={5}>
					<Text>Blacklisted mirror-parents:</Text>
					<Button ml={5} p="3px 7px" text="+" enabled={enabled && !comp.blacklistAllMirrorParents} onClick={()=>{
						comp.blacklistedMirrorParents.push("");
						Change();
					}}/>
				</Row>
				{comp.blacklistedMirrorParents.map((nodeID, index)=>{
					return <NodeInArrayRow key={index} {...this.props} enabled={enabled && !comp.blacklistAllMirrorParents} comp={comp} nodeArrayKey="blacklistedMirrorParents" nodeEntry={nodeID} nodeEntryIndex={index}/>;
				})}
			</>
		);
	}
}

class TagCompUI_CloneHistory extends BaseComponentPlus({} as TagDetailsUI_SharedProps, {}) {
	render() {
		const {newData, enabled, splitAt, Change} = this.props;
		const comp = newData.cloneHistory!;
		return (
			<>
				<Row mt={5}>
					<Text>Clone chain:</Text>
					<Button ml={5} p="3px 7px" text="+" enabled={enabled} onClick={()=>{
						comp.cloneChain.push("");
						Change();
					}}/>
				</Row>
				{comp.cloneChain.map((nodeID, index)=>{
					return <NodeInArrayRow key={index} {...this.props} enabled={enabled} comp={comp} nodeArrayKey="cloneChain" nodeEntry={nodeID} nodeEntryIndex={index}/>;
				})}
			</>
		);
	}
}

@Observer
class NodeSlotRow extends BaseComponentPlus({mt: 5} as TagDetailsUI_SharedProps & {comp: TagComp, nodeKey: string, label: string, mt?: number | string}, {}) {
	render() {
		const {newData, enabled, compClass, splitAt, Change, comp, nodeKey, label, mt} = this.props;

		const nodeID = comp[nodeKey];
		const nodeL2 = Validate("UUID", nodeID) == null ? GetNodeL2(nodeID) : null;
		let displayText = `(Node not found for ID: ${nodeID})`;
		let backgroundColor = GetNodeColor({type: NodeType.category} as any).desaturate(0.5).alpha(0.8);
		if (nodeL2) {
			const path = nodeL2.id;
			const nodeL3 = AsNodeL3(nodeL2, null);
			displayText = GetNodeDisplayText(nodeL2, path);
			backgroundColor = GetNodeColor(nodeL3).desaturate(0.5).alpha(0.8);
		}

		return (
			<RowLR mt={mt} splitAt={splitAt} style={{width: "100%"}}>
				<Text>{label}:</Text>
				<TextInput value={nodeID} enabled={enabled} style={{flex: 25, minWidth: 0}} onChange={val=>{
					comp.VSet(nodeKey, DelIfFalsy(val));
					newData.nodes = CalculateNodeIDsForTagComp(comp, compClass);
					Change();
				}}/>
				<Row sel
					style={{flex: 75, minWidth: 0, whiteSpace: "normal", padding: 5, fontSize: 12, background: backgroundColor.css(), borderRadius: 5, /*cursor: "pointer",*/ border: "1px solid rgba(0,0,0,.5)"}}
					onMouseDown={e=>{
						if (e.button !== 2) return false;
						// this.SetState({ menuOpened: true });
					}}
					//onClick={()=>this.SetState({detailsOpen: !detailsOpen})}
				>
					<span>{displayText}</span>
				</Row>
			</RowLR>
		);
	}
}

@Observer
class NodeInArrayRow extends BaseComponentPlus({} as TagDetailsUI_SharedProps & {comp: TagComp, nodeArrayKey: string, nodeEntry: string, nodeEntryIndex: number}, {}) {
	render() {
		const {newData, enabled, compClass, splitAt, Change, comp, nodeArrayKey, nodeEntry, nodeEntryIndex} = this.props;

		const nodeID = nodeEntry;
		const nodeL2 = Validate("UUID", nodeID) == null ? GetNodeL2(nodeID) : null;
		let displayText = `(Node not found for ID: ${nodeID})`;
		let backgroundColor = GetNodeColor({type: NodeType.category} as any).desaturate(0.5).alpha(0.8);
		if (nodeL2) {
			const path = nodeL2.id;
			const nodeL3 = AsNodeL3(nodeL2, null);
			displayText = GetNodeDisplayText(nodeL2, path);
			backgroundColor = GetNodeColor(nodeL3).desaturate(0.5).alpha(0.8);
		}

		return (
			<RowLR mt={5} splitAt={30} style={{width: "100%"}}>
				<Text>#{nodeEntryIndex + 1}:</Text>
				<Row style={{flex: 1, alignItems: "stretch"}}>
					<TextInput value={nodeEntry} enabled={enabled} style={{flex: 25, minWidth: 0, borderRadius: "5px 0 0 5px"}} onChange={val=>{
						comp[nodeArrayKey][nodeEntryIndex] = val;
						newData.nodes = CalculateNodeIDsForTagComp(comp, compClass);
						Change();
					}}/>
					<Row sel style={{flex: 75, minWidth: 0, whiteSpace: "normal", padding: 5, fontSize: 12, background: backgroundColor.css(), /*cursor: "pointer",*/ border: "1px solid rgba(0,0,0,.5)"}}>
						<span>{displayText}</span>
					</Row>
					<Button text="X" enabled={enabled} style={{padding: "3px 5px", borderRadius: "0 5px 5px 0"}} onClick={()=>{
						comp[nodeArrayKey].RemoveAt(nodeEntryIndex);
						Change();
					}}/>
				</Row>
			</RowLR>
		);
	}
}

export function ShowAddTagDialog(initialData: Partial<NodeTag>, postAdd?: (id: string)=>void) {
	let newTag = new NodeTag(initialData);
	//const getCommand = ()=>new AddNodeTag({tag: newTag});

	const boxController: BoxController = ShowMessageBox({
		title: "Add tag", cancelButton: true,
		message: observer_mgl(()=>{
			/*const tempCommand = getCommand();
			const oldProps = boxController.options.okButtonProps;
			boxController.options.okButtonProps = {
				enabled: tempCommand.Validate_Safe() == null,
				title: tempCommand.ValidateErrorStr,
			};
			// temp (till react-vmessagebox is updated to allow more ergonomic ok-button-enabledness updating)
			if (boxController.options.okButtonProps.enabled != !!oldProps?.enabled) {
				boxController.UpdateUI();
			}*/

			return (
				<Column style={{padding: "10px 0", width: 500}}>
					<TagDetailsUI baseData={newTag} phase="create"
						onChange={val=>{
							newTag = val;
							boxController.UpdateUI();
						}}/>
				</Column>
			);
		}),
		onOK: async()=>{
			//const {id} = await getCommand().RunOnServer();
			const {id} = await RunCommand_AddNodeTag(newTag);
			if (postAdd) postAdd(id);
		},
	});
}