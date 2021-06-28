// import {Column, Row} from "web-vcore/nm/react-vcomponents";
// import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox";
// import {Layer} from "dm_common";
// import {MeID} from "dm_common";
// import {AddLayer} from "dm_common";
// import {LayerDetailsUI} from "../LayerDetailsUI";

// export function ShowAddLayerDialog(userID: string) {
// 	let newLayer = new Layer({
// 		name: "",
// 		creator: MeID(),
// 	});

// 	let error = null;
// 	const Change = (..._)=>boxController.UpdateUI();
// 	let boxController = ShowMessageBox({
// 		title: "Add layer", cancelButton: true,
// 		message: ()=>{
// 			boxController.options.okButtonProps = {enabled: error == null};
// 			return (
// 				<Column style={{padding: "10px 0", width: 600}}>
// 					<LayerDetailsUI baseData={newLayer} forNew={true} onChange={(val, ui)=>Change(newLayer = val, error = ui.GetValidationError())}/>
// 					{error && error != "Please fill out this field." && <Row mt={5} style={{color: "rgba(200,70,70,1)"}}>{error}</Row>}
// 				</Column>
// 			);
// 		},
// 		onOK: ()=>{
// 			new AddLayer({layer: newLayer}).Run();
// 		},
// 	});
// }