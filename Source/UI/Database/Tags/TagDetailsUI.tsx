import {Clone, E, DelIfFalsy} from "js-vextensions";
import {Column, Pre, RowLR, Select, Text, Row, TextInput, CheckBox} from "react-vcomponents";
import {BaseComponentPlus} from "react-vextensions";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
import {AddNodeTag} from "Server/Commands/AddNodeTag";
import {MapNodeTag, TagComp_names, GetTagCompClassByTag, CalculateTagCompKey, GetTagCompClassByDisplayName, TagComp_classes, TagComp, TagComp_Class, TagComp_MirrorChildrenFromXToY} from "Store/firebase/nodeTags/@MapNodeTag";
import {IDAndCreationInfoUI} from "UI/@Shared/CommonPropUIs/IDAndCreationInfoUI";
import {ES} from "Utils/UI/GlobalStyles";
import {GetUser} from "../../../Store/firebase/users";
import {Validate} from "vwebapp-framework";
import {observer} from "mobx-react";

type Props = {baseData: MapNodeTag, forNew: boolean, enabled?: boolean, style?, onChange?: (newData: MapNodeTag)=>void};
type State = {newData: MapNodeTag};
export type TagDetailsUI_SharedProps = Props & State & {compClass: TagComp_Class, splitAt, Change};

export class TagDetailsUI extends BaseComponentPlus({} as Props, {} as State) {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) { // if base-data changed
			this.SetState({newData: Clone(props.baseData)});
			/*this.SetState({newData: Clone(props.baseData)}, ()=> {
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
		const creator = !forNew && GetUser(baseData.creator);
		const compClass = GetTagCompClassByTag(newData);

		const Change = (..._)=>this.OnChange();

		const splitAt = 70;
		let sharedProps = E(this.props, this.state, {compClass, splitAt, Change});
		return (
			<Column style={style}>
				{!forNew &&
					<IDAndCreationInfoUI id={baseData._key} creator={creator} createdAt={newData.createdAt}/>}
				<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
					<Pre>Type: </Pre>
					<Select options={TagComp_classes.map(a=>({name: a.displayName, value: a}))} enabled={false} style={ES({flex: 1})} value={compClass} onChange={(newCompClass: TagComp_Class)=> {
						delete newData[compClass.key];
						newData[newCompClass.key] = new newCompClass();
						Change();
					}}/>
				</RowLR>
				{compClass == TagComp_MirrorChildrenFromXToY &&
					<MirrorChildrenFromXToY_UI {...sharedProps}/>}
			</Column>
		);
	}
	/*GetValidationError() {
		return GetErrorMessagesUnderElement(GetDOM(this))[0];
	}*/

	GetNewData() {
		const {newData} = this.state;
		return Clone(newData) as MapNodeTag;
	}
}

class MirrorChildrenFromXToY_UI extends BaseComponentPlus({} as TagDetailsUI_SharedProps, {}) {
	render() {
		let {newData, splitAt, Change} = this.props;
		let comp = newData.mirrorChildrenFromXToY;
		return (
			<>
				<NodeSlotRow {...this.props} comp={comp} nodeKey="nodeX" label="Node X"/>
				<NodeSlotRow {...this.props} comp={comp} nodeKey="nodeY" label="Node Y"/>
				<CheckBox mt={5} text="Mirror X's supporting arguments" checked={comp.mirrorSupporting} onChange={val=>Change(comp.mirrorSupporting = val)}/>
				<CheckBox mt={5} text="Mirror X's opposing arguments" checked={comp.mirrorOpposing} onChange={val=>Change(comp.mirrorOpposing = val)}/>
				<CheckBox mt={5} text="Reverse argument polarities" checked={comp.reversePolarities} onChange={val=>Change(comp.reversePolarities = val)}/>
			</>
		);
	}
}

class NodeSlotRow extends BaseComponentPlus({canBeEmpty: true} as TagDetailsUI_SharedProps & {comp: TagComp, nodeKey: string, label: string, canBeEmpty?: boolean}, {}) {
	render() {
		let {newData, compClass, splitAt, Change, comp, nodeKey, label} = this.props;
		return (
			<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
				<Text>{label}:</Text>
				<TextInput value={comp[nodeKey]} style={{flex: 1}} onChange={val=> {
					comp.VSet(nodeKey, DelIfFalsy(val));
					newData.nodes = compClass.nodeKeys.map(key=>comp[key]).filter(nodeID=>Validate("UUID", nodeID) == null);
					Change();
				}}/>
			</RowLR>
		);
	}
}

export function ShowAddTagDialog(initialData: Partial<MapNodeTag>, postAdd?: (id: string)=>void) {
	let newTag = new MapNodeTag(initialData);
	const getCommand = ()=>new AddNodeTag({tag: newTag});

	const boxController: BoxController = ShowMessageBox({
		title: "Add tag", cancelButton: true,
		message: observer(()=>{
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
		})["type"],
		onOK: async()=>{
			const id = await getCommand().Run();
			if (postAdd) postAdd(id);
		},
	});
}