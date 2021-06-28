// import {Clone, GetEntries, GetErrorMessagesUnderElement, CloneWithPrototypes} from "web-vcore/nm/js-vextensions";
// import Moment from "web-vcore/nm/moment";
// import {Column, Pre, RowLR, Select, TextArea, TextInput, Row} from "web-vcore/nm/react-vcomponents";
// import {BaseComponentWithConnector, GetDOM, BaseComponentPlus} from "web-vcore/nm/react-vextensions";
// import {BoxController, ShowMessageBox} from "web-vcore/nm/react-vmessagebox";
// import {ES} from "Utils/UI/GlobalStyles";
// import {IDAndCreationInfoUI} from "UI/@Shared/CommonPropUIs/IDAndCreationInfoUI";
// import {MapNodePhrasing, MapNodePhrasingType, AddPhrasing} from "dm_common";

// export class PhrasingDetailsUI extends BaseComponentPlus(
// 	{enabled: true} as {baseData: MapNodePhrasing, forNew: boolean, enabled?: boolean, style?, onChange?: (newData: MapNodePhrasing, error: string)=>void},
// 	{newData: null as MapNodePhrasing, dataError: null as string},
// ) {
// 	ComponentWillMountOrReceiveProps(props, forMount) {
// 		if (forMount || props.baseData != this.props.baseData) { // if base-data changed
// 			this.SetState({newData: CloneWithPrototypes(props.baseData)});
// 		}
// 	}
// 	OnChange() {
// 		const {onChange} = this.props;
// 		const newData = this.GetNewData();
// 		const error = this.GetValidationError();
// 		if (onChange) onChange(newData, error);
// 		this.SetState({newData, dataError: error});
// 	}

// 	render() {
// 		const {baseData, forNew, enabled, style} = this.props;
// 		const {newData} = this.state;

// 		const Change = (..._)=>this.OnChange();

// 		const splitAt = 100;
// 		return (
// 			<Column style={style}>
// 				{!forNew &&
// 					<IDAndCreationInfoUI id={baseData.id} creatorID={newData.creator} createdAt={newData.createdAt}/>}
// 				<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
// 					<Pre>Type: </Pre>
// 					<Select options={GetEntries(MapNodePhrasingType)} enabled={false} style={ES({flex: 1})}
// 						value={newData.type} onChange={val=>Change(newData.type = val)}/>
// 				</RowLR>
// 				<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
// 					<Pre>Text: </Pre>
// 					<TextInput required enabled={enabled} style={ES({flex: 1})}
// 						value={newData.text} onChange={val=>Change(newData.text = val)}/>
// 				</RowLR>
// 				<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
// 					<Pre>Description: </Pre>
// 					<TextArea enabled={enabled} autoSize={true} style={ES({flex: 1})}
// 						value={newData.description} onChange={val=>Change(newData.description = val)}/>
// 				</RowLR>
// 			</Column>
// 		);
// 	}
// 	GetValidationError() {
// 		return GetErrorMessagesUnderElement(GetDOM(this))[0];
// 	}

// 	GetNewData() {
// 		const {newData} = this.state;
// 		return CloneWithPrototypes(newData) as MapNodePhrasing;
// 	}
// }

// export function ShowAddPhrasingDialog(nodeID: string, type: MapNodePhrasingType) {
// 	let newEntry = new MapNodePhrasing({
// 		node: nodeID,
// 		type,
// 	});

// 	let valid = false;
// 	const boxController: BoxController = ShowMessageBox({
// 		title: "Add phrasing", cancelButton: true,
// 		message: ()=>{
// 			boxController.options.okButtonProps = {enabled: valid};
// 			return (
// 				<Column style={{padding: "10px 0", width: 800}}>
// 					<PhrasingDetailsUI baseData={newEntry} forNew={true}
// 						onChange={(val, error)=>{
// 							newEntry = val;
// 							valid = !error;
// 							boxController.UpdateUI();
// 						}}/>
// 				</Column>
// 			);
// 		},
// 		onOK: ()=>{
// 			new AddPhrasing({phrasing: newEntry}).Run();
// 		},
// 	});
// }