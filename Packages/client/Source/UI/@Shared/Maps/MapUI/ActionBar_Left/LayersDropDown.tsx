// import {E} from "web-vcore/nm/js-vextensions.js";
// import {Button, CheckBox, Column, DropDown, DropDownContent, DropDownTrigger, Row} from "web-vcore/nm/react-vcomponents.js";
// import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
// import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
// import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
// import {MeID, GetUser, GetLayers, ForDeleteLayer_GetError, GetMapLayerIDs, IsUserCreatorOrMod, Layer, GetUserLayerStateForMap, DeleteLayer, SetLayerAttachedToMap, SetMapLayerStateForUser, Map} from "dm_common";


// import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel.js";


// import {ShowAddLayerDialog} from "../../Layers/AddLayerDialog.js";
// import {ES} from "../../../../../Utils/UI/GlobalStyles.js";

// export const columnWidths = [0.5, 0.3, 0.1, 0.1];

// type LayersDropDownProps = {map: Map};
// class LayersDropDown extends BaseComponentPlus({} as LayersDropDownProps, {}) {
// 	render() {
// 		const {map} = this.props;
// 		const userID = MeID();
// 		const layers = GetLayers();
// 		const creatorOrMod = IsUserCreatorOrMod(userID, map);
// 		return (
// 			<DropDown>
// 				<DropDownTrigger><Button ml={5} text="Layers"/></DropDownTrigger>
// 				<DropDownContent style={{left: 0, padding: null, background: null, borderRadius: null}}>
// 					<Row style={{alignItems: "flex-start"}}>
// 						<Column style={{width: 600}}>
// 							<Column className="clickThrough" style={{height: 80, background: liveSkin.MainBackgroundColor().css() /* borderRadius: "10px 10px 0 0" */, maxHeight: 320}}>
// 								<Row style={{height: 40, padding: 10}}>
// 									{/* <Row width={200} style={{position: "absolute", left: "calc(50% - 100px)"}}>
// 										<Button text={<Icon icon="arrow-left" size={15}/>} title="Previous page"
// 											enabled={page > 0} onClick={()=> {
// 												//store.dispatch(new ACTMapNodeListPageSet({mapID: map._id, page: page - 1}));
// 												store.dispatch(new ACTMapNodeListPageSet({mapID: map._id, page: page - 1}));
// 											}}/>
// 										<Div ml={10} mr={7}>Page: </Div>
// 										<TextInput mr={10} pattern="[0-9]+" style={{width: 30}} value={page + 1}
// 											onChange={val=> {
// 												if (!IsNumberString(val)) return;
// 												store.dispatch(new ACTMapNodeListPageSet({mapID: map._id, page: (parseInt(val) - 1).KeepBetween(0, lastPage)}))
// 											}}/>
// 										<Button text={<Icon icon="arrow-right" size={15}/>} title="Next page"
// 											enabled={page < lastPage} onClick={()=> {
// 												store.dispatch(new ACTMapNodeListPageSet({mapID: map._id, page: page + 1}));
// 											}}/>
// 									</Row>
// 									<Div mlr="auto"/>
// 									<Pre>Filter:</Pre>
// 									<InfoButton text="Hides nodes without the given text. Regular expressions can be used, ex: /there are [0-9]+ dimensions/"/>
// 									<TextInput ml={2} value={filter} onChange={val=>store.dispatch(new ACTMapNodeListFilterSet({mapID: map._id, filter: val}))}/> */}
// 									<Button ml="auto" text="Add layer" onClick={()=>{
// 										if (userID == null) return ShowSignInPopup();
// 										ShowAddLayerDialog(userID);
// 									}}/>
// 								</Row>
// 								<Row style={{position: "relative", height: 40, padding: 10}}>
// 									<span style={{position: "absolute", right: 27, top: 3, fontSize: 13}}>Enabled for...</span>
// 									<span style={{flex: columnWidths[0], fontWeight: 500, fontSize: 17}}>Title</span>
// 									<span style={{flex: columnWidths[1], fontWeight: 500, fontSize: 17}}>Creator</span>
// 									<span style={{flex: columnWidths[2], marginTop: 15, fontWeight: 500, fontSize: 15}}>Map</span>
// 									<span style={{flex: columnWidths[3], marginTop: 15, fontWeight: 500, fontSize: 15}}>User</span>
// 								</Row>
// 							</Column>
// 							<ScrollView style={ES({flex: 1})} contentStyle={ES({flex: 1, position: "relative"})}>
// 								{layers.length == 0 && <div style={{textAlign: "center", fontSize: 18}}>Loading...</div>}
// 								{layers.map((layer, index)=><LayerUI key={layer.id} index={index} last={index == layers.length - 1} map={map} layer={layer}/>)}
// 							</ScrollView>
// 						</Column>
// 						{false &&
// 							<Column style={{width: 400}}>
// 							</Column>}
// 					</Row>
// 				</DropDownContent>
// 			</DropDown>
// 		);
// 	}
// }

// class LayerUI extends BaseComponentPlus({} as {index: number, last: boolean, map: Map, layer: Layer}, {}) {
// 	render() {
// 		const {index, last, map, layer} = this.props;
// 		const userID = MeID();
// 		// const creator = GetUser({if: layer}, layer.creator); // todo
// 		const creator = GetUser(layer ? layer.creator : null);
// 		const userLayerState = GetUserLayerStateForMap(userID, map.id, layer.id);
// 		const creatorOrMod = IsUserCreatorOrMod(userID, map);
// 		const deleteLayerError = ForDeleteLayer_GetError(userID, layer);
// 		return (
// 			<Column p="7px 10px" style={E(
// 				{background: index % 2 == 0 ? "rgba(30,30,30,.7)" : liveSkin.MainBackgroundColor().css()},
// 				last && {borderRadius: "0 0 10px 10px"},
// 			)}>
// 				<Row>
// 					<span style={{flex: columnWidths[0]}}>
// 						{layer.name}
// 						{creator && creator.id == MeID() &&
// 							<Button text="X" ml={5} style={{padding: "3px 5px"}} enabled={deleteLayerError == null} title={deleteLayerError}
// 								onClick={()=>{
// 									ShowMessageBox({
// 										title: `Delete "${layer.name}"`, cancelButton: true,
// 										message: `Delete the layer "${layer.name}"?`,
// 										onOK: async()=>{
// 											new DeleteLayer({layerID: layer.id}).RunOnServer();
// 										},
// 									});
// 								}}/>}
// 					</span>
// 					<span style={{flex: columnWidths[1]}}>{creator ? creator.displayName : "..."}</span>
// 					<span style={{flex: columnWidths[2]}}>
// 						<CheckBox enabled={creatorOrMod} value={GetMapLayerIDs(map.id).Contains(layer.id)} onChange={val=>{
// 							new SetLayerAttachedToMap({mapID: map.id, layerID: layer.id, attached: val}).RunOnServer();
// 						}}/>
// 					</span>
// 					<span style={{flex: columnWidths[3]}}>
// 						<CheckBox value={userLayerState ?? "partial"} onChange={val=>{
// 							if (MeID() == null) return ShowSignInPopup();
// 							const newState =								userLayerState == null ? true
// 								: userLayerState == true ? false
// 								: null;
// 							new SetMapLayerStateForUser({userID: MeID(), mapID: map.id, layerID: layer.id, state: newState}).RunOnServer();
// 						}}/>
// 					</span>
// 				</Row>
// 			</Column>
// 		);
// 	}
// }