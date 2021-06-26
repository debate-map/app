import {Clone, E, DelIfFalsy, CloneWithPrototypes} from "web-vcore/nm/js-vextensions";
import {Column, Pre, RowLR, Select, Text, Row, TextInput, CheckBox, Button} from "web-vcore/nm/react-vcomponents";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions";
import {BoxController, ShowMessageBox} from "web-vcore/nm/react-vmessagebox";
import {IDAndCreationInfoUI} from "UI/@Shared/CommonPropUIs/IDAndCreationInfoUI";
import {ES} from "Utils/UI/GlobalStyles";
import {InfoButton, observer_simple} from "web-vcore";
import {Validate} from "web-vcore/nm/mobx-graphlink";
import {GetNodeL2, AsNodeL3, GetNodeDisplayText} from "dm_common";
import {MapNodeType} from "dm_common";
import {AddNodeTag} from "dm_common";
import {MapNodeTag, TagComp_Class, GetTagCompClassByTag, TagComp_classes, TagComp_MirrorChildrenFromXToY, TagComp_XIsExtendedByY, TagComp_MutuallyExclusiveGroup, TagComp_RestrictMirroringOfX, TagComp, CalculateNodeIDsForTagComp} from "dm_common";
import {GetNodeColor} from "Store/firebase_ext/nodes";

type Props = {baseData: MapNodeTag, forNew: boolean, enabled?: boolean, style?, onChange?: (newData: MapNodeTag)=>void};
type State = {newData: MapNodeTag};
export type TagDetailsUI_SharedProps = Props & State & {compClass: TagComp_Class, splitAt, Change};

export class TagDetailsUI extends BaseComponentPlus({enabled: true} as Props, {} as State) {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) { // if base-data changed
			this.SetState({newData: CloneWithPrototypes(props.baseData)});
			/*this.SetState({newData: CloneWithPrototypes(props.baseData)}, ()=> {
				if (forMount) this.OnChange(); // call onChange once, so parent-ui has access to the newData value (without needing ref)
			});*/
		}
	}
	OnChange() {
		const {onChange} = this.props;
		const newData = this.GetNewData();
		if (onChange) onChange(newData);
		this.SetState({newData});
	}

	render() {
		const {baseData, forNew, enabled, style} = this.props;
		const {newData} = this.state;
		const compClass = GetTagCompClassByTag(newData);

		const Change = (..._)=>this.OnChange();

		//const splitAt = compClass == TagComp_XIsExtendedByY ? 140 : 70;
		const splitAt = 70;
		let sharedProps = E(this.props, this.state, {compClass, splitAt, Change});
		return (
			<Column style={style}>
				{!forNew &&
					<IDAndCreationInfoUI id={baseData.id} creatorID={newData.creator} createdAt={newData.createdAt} singleLine={true}/>}
				<RowLR mt={5} mb={5} splitAt={splitAt} style={{width: "100%"}}>
					<Pre>Type: </Pre>
					<Select options={TagComp_classes.map(a=>({name: a.displayName, value: a}))} enabled={enabled} style={ES({flex: 1})} value={compClass} onChange={(newCompClass: TagComp_Class)=> {
						delete newData[compClass.key];
						newData[newCompClass.key] = new newCompClass();
						Change();
					}}/>
					<InfoButton ml={5} text={compClass.description}/>
				</RowLR>
				{compClass == TagComp_MirrorChildrenFromXToY &&
					<TagCompUI_MirrorChildrenFromXToY {...sharedProps}/>}
				{compClass == TagComp_XIsExtendedByY &&
					<TagCompUI_XIsExtendedByY {...sharedProps}/>}
				{compClass == TagComp_MutuallyExclusiveGroup &&
					<TagCompUI_MutuallyExclusiveGroup {...sharedProps}/>}
				{compClass == TagComp_RestrictMirroringOfX &&
					<TagCompUI_RestrictMirroringOfX {...sharedProps}/>}
			</Column>
		);
	}
	/*GetValidationError() {
		return GetErrorMessagesUnderElement(GetDOM(this))[0];
	}*/

	GetNewData() {
		const {newData} = this.state;
		return CloneWithPrototypes(newData) as MapNodeTag;
	}
}

class TagCompUI_MirrorChildrenFromXToY extends BaseComponentPlus({} as TagDetailsUI_SharedProps, {}) {
	render() {
		let {newData, enabled, splitAt, Change} = this.props;
		let comp = newData.mirrorChildrenFromXToY;
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
		let {newData, enabled, splitAt, Change} = this.props;
		let comp = newData.xIsExtendedByY;
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
		let {newData, enabled, splitAt, Change} = this.props;
		let comp = newData.mutuallyExclusiveGroup;
		return (
			<>
				<Row>
					<Text>Nodes in group:</Text>
					<Button ml={5} p="3px 7px" text="+" enabled={enabled} onClick={()=>{
						comp.nodes.push("");
						Change();
					}}/>
				</Row>
				{comp.nodes.map((nodeID, index)=> {
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
		let {newData, enabled, splitAt, Change} = this.props;
		let comp = newData.restrictMirroringOfX;
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
				{comp.blacklistedMirrorParents.map((nodeID, index)=> {
					return <NodeInArrayRow key={index} {...this.props} enabled={enabled && !comp.blacklistAllMirrorParents} comp={comp} nodeArrayKey="blacklistedMirrorParents" nodeEntry={nodeID} nodeEntryIndex={index}/>;
				})}
			</>
		);
	}
}

class NodeSlotRow extends BaseComponentPlus({mt: 5} as TagDetailsUI_SharedProps & {comp: TagComp, nodeKey: string, label: string, mt?: number | string}, {}) {
	render() {
		let {newData, enabled, compClass, splitAt, Change, comp, nodeKey, label, mt} = this.props;

		let nodeID = comp[nodeKey];
		let nodeL2 = Validate("UUID", nodeID) == null ? GetNodeL2(nodeID) : null;
		let displayText = `(Node not found for ID: ${nodeID})`;
		let backgroundColor = GetNodeColor({type: MapNodeType.Category} as any).desaturate(0.5).alpha(0.8);
		if (nodeL2) {
			const path = nodeL2.id;
			const nodeL3 = AsNodeL3(nodeL2);
			displayText = GetNodeDisplayText(nodeL2, path);
			backgroundColor = GetNodeColor(nodeL3).desaturate(0.5).alpha(0.8);
		}

		return (
			<RowLR mt={mt} splitAt={splitAt} style={{width: "100%"}}>
				<Text>{label}:</Text>
				<TextInput value={nodeID} enabled={enabled} style={{flex: 25, minWidth: 0}} onChange={val=> {
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

class NodeInArrayRow extends BaseComponentPlus({} as TagDetailsUI_SharedProps & {comp: TagComp, nodeArrayKey: string, nodeEntry: string, nodeEntryIndex: number}, {}) {
	render() {
		let {newData, enabled, compClass, splitAt, Change, comp, nodeArrayKey, nodeEntry, nodeEntryIndex} = this.props;

		let nodeID = nodeEntry;
		let nodeL2 = Validate("UUID", nodeID) == null ? GetNodeL2(nodeID) : null;
		let displayText = `(Node not found for ID: ${nodeID})`;
		let backgroundColor = GetNodeColor({type: MapNodeType.Category} as any).desaturate(0.5).alpha(0.8);
		if (nodeL2) {
			const path = nodeL2.id;
			const nodeL3 = AsNodeL3(nodeL2);
			displayText = GetNodeDisplayText(nodeL2, path);
			backgroundColor = GetNodeColor(nodeL3).desaturate(0.5).alpha(0.8);
		}

		return (
			<RowLR mt={5} splitAt={30} style={{width: "100%"}}>
				<Text>#{nodeEntryIndex + 1}:</Text>
				<Row style={{flex: 1, alignItems: "stretch"}}>
					<TextInput value={nodeEntry} enabled={enabled} style={{flex: 25, minWidth: 0, borderRadius: "5px 0 0 5px"}} onChange={val=> {
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

export function ShowAddTagDialog(initialData: Partial<MapNodeTag>, postAdd?: (id: string)=>void) {
	let newTag = new MapNodeTag(initialData);
	const getCommand = ()=>new AddNodeTag({tag: newTag});

	const boxController: BoxController = ShowMessageBox({
		title: "Add tag", cancelButton: true,
		message: observer_simple(()=>{
			const tempCommand = getCommand();
			boxController.options.okButtonProps = {
				enabled: tempCommand.Validate_Safe() == null,
				title: tempCommand.validateError,
			};

			return (
				<Column style={{padding: "10px 0", width: 500}}>
					<TagDetailsUI baseData={newTag} forNew={true}
						onChange={val=>{
							newTag = val;
							boxController.UpdateUI();
						}}/>
				</Column>
			);
		}),
		onOK: async()=>{
			const id = await getCommand().Run();
			if (postAdd) postAdd(id);
		},
	});
}