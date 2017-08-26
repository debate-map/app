import {Map, MapType} from "../../../../Store/firebase/maps/@Map";
import {Connect} from "Frame/Database/FirebaseConnect";
import {IsUserCreatorOrMod} from "../../../../Store/firebase/userExtras";
import {GetUserID, GetUser} from "Store/firebase/users";
import {BaseComponent, GetInnerComp} from "../../../../Frame/UI/ReactGlobals";
import Row from "Frame/ReactComponents/Row";
import Button from "Frame/ReactComponents/Button";
import {ACTDebateMapSelect} from "../../../../Store/main/debates";
import MapDetailsUI from "../MapDetailsUI";
import DropDown from "../../../../Frame/ReactComponents/DropDown";
import {DropDownContent, DropDownTrigger} from "../../../../Frame/ReactComponents/DropDown";
import Column from "../../../../Frame/ReactComponents/Column";
import {GetUpdates} from "../../../../Frame/General/Others";
import UpdateMapDetails from "../../../../Server/Commands/UpdateMapDetails";
import {GetNodeAsync, GetChildCount} from "Store/firebase/nodes";
import {ShowMessageBox} from "../../../../Frame/UI/VMessageBox";
import DeleteMap from "../../../../Server/Commands/DeleteMap";
import {colors} from "../../../../Frame/UI/GlobalStyles";
import { GetLayers, GetMapLayerIDs, ForDeleteLayer_GetError } from "../../../../Store/firebase/layers";
import {Layer} from "Store/firebase/layers/@Layer";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel";
import {ShowAddLayerDialog} from "../Layers/AddLayerDialog";
import ScrollView from "react-vscrollview";
import {User} from "../../../../Store/firebase/users";
import CheckBox from "../../../../Frame/ReactComponents/CheckBox";
import { GetUserLayerStatesForMap } from "Store/firebase/userMapInfo";
import { LayerStatesMap } from "Store/firebase/userMapInfo/@UserMapInfo";
import {GetUserLayerStateForMap} from "../../../../Store/firebase/userMapInfo";
import SetLayerAttachedToMap from "../../../../Server/Commands/SetLayerAttachedToMap";
import SetMapLayerStateForUser from "../../../../Server/Commands/SetMapLayerStateForUser";
import DeleteLayer from "../../../../Server/Commands/DeleteLayer";

type ActionBar_LeftProps = {map: Map, subNavBarWidth: number};
@Connect((state, {map}: ActionBar_LeftProps)=> ({
	_: IsUserCreatorOrMod(GetUserID(), map),
}))
export class ActionBar_Left extends BaseComponent<ActionBar_LeftProps, {}> {
	render() {
		let {map, subNavBarWidth} = this.props;
		return (
			<nav style={{
				position: "absolute", zIndex: 1, left: 0, width: `calc(50% - ${subNavBarWidth / 2}px)`, top: 0, textAlign: "center",
				//background: "rgba(0,0,0,.5)", boxShadow: "3px 3px 7px rgba(0,0,0,.07)",
			}}>
				<Row style={{
					justifyContent: "flex-start", background: "rgba(0,0,0,.7)", boxShadow: colors.navBarBoxShadow,
					width: "100%", height: 30, borderRadius: "0 0 10px 0",
				}}>
					{map.type == MapType.Debate &&
						<Button text="Back" onClick={()=> {
							store.dispatch(new ACTDebateMapSelect({id: null}));
						}}/>}
					{map.type == MapType.Debate && <DetailsDropDown map={map}/>}
					{map.type == MapType.Debate && <LayersDropDown map={map}/>}
				</Row>
			</nav>
		);
	}
}

class DetailsDropDown extends BaseComponent<{map: Map}, {dataError: string}> {
	detailsUI: MapDetailsUI;
	render() {
		let {map} = this.props;
		let {dataError} = this.state;
		let creatorOrMod = IsUserCreatorOrMod(GetUserID(), map);
		return (
			<DropDown>
				<DropDownTrigger><Button ml={5} text="Details"/></DropDownTrigger>
				<DropDownContent style={{left: 0}}><Column>
					<MapDetailsUI ref={c=>this.detailsUI = GetInnerComp(c) as any} baseData={map}
						forNew={false} enabled={creatorOrMod}
						onChange={newData=> {
							this.SetState({dataError: this.detailsUI.GetValidationError()});
						}}/>
					{creatorOrMod &&
						<Row>
							<Button mt={5} text="Save" enabled={dataError == null} onLeftClick={async ()=> {
								let mapUpdates = GetUpdates(map, this.detailsUI.GetNewData()).Excluding("layers");
								await new UpdateMapDetails({mapID: map._id, mapUpdates}).Run();
							}}/>
						</Row>}
					{creatorOrMod &&
						<Column mt={10}>
							<Row style={{fontWeight: "bold"}}>Advanced:</Row>
							<Row>
								<Button mt={5} text="Delete" onLeftClick={async ()=> {
									let rootNode = await GetNodeAsync(map.rootNode);
									if (GetChildCount(rootNode) != 0) {
										return void ShowMessageBox({title: `Still has children`,
											message: `Cannot delete this map until all the children of its root-node have been unlinked or deleted.`});
									}

									ShowMessageBox({
										title: `Delete "${map.name}"`, cancelButton: true,
										message: `Delete the map "${map.name}"?`,
										onOK: async ()=> {
											await new DeleteMap({mapID: map._id}).Run();
											store.dispatch(new ACTDebateMapSelect({id: null}));
										}
									});
								}}/>
							</Row>
						</Column>}
				</Column></DropDownContent>
			</DropDown>
		);
	}
}

export const columnWidths = [.5, .3, .1, .1];

type LayersDropDownProps = {map: Map} & Partial<{layers: Layer[]}>;
@Connect((state, {map}: LayersDropDownProps)=> ({
	//layers: GetLayersForMap(map),
	layers: GetLayers(),
}))
class LayersDropDown extends BaseComponent<LayersDropDownProps, {}> {
	render() {
		let {map, layers} = this.props;
		let userID = GetUserID();
		let creatorOrMod = IsUserCreatorOrMod(userID, map);
		return (
			<DropDown>
				<DropDownTrigger><Button ml={5} text="Layers"/></DropDownTrigger>
				<DropDownContent style={{left: 0, padding: null, background: null, borderRadius: null}}>
					<Row style={{alignItems: "flex-start"}}>
						<Column style={{width: 600, height: 350}}>
							<Column className="clickThrough" style={{height: 80, background: "rgba(0,0,0,.7)", /*borderRadius: "10px 10px 0 0"*/}}>
								<Row style={{height: 40, padding: 10}}>
									{/*<Row width={200} style={{position: "absolute", left: "calc(50% - 100px)"}}>
										<Button text={<Icon icon="arrow-left" size={15}/>} title="Previous page"
											enabled={page > 0} onClick={()=> {
												//store.dispatch(new ACTMapNodeListPageSet({mapID: map._id, page: page - 1}));
												store.dispatch(new ACTMapNodeListPageSet({mapID: map._id, page: page - 1}));
											}}/>
										<Div ml={10} mr={7}>Page: </Div>
										<TextInput mr={10} pattern="[0-9]+" style={{width: 30}} value={page + 1}
											onChange={val=> {
												if (!IsNumberString(val)) return;
												store.dispatch(new ACTMapNodeListPageSet({mapID: map._id, page: (parseInt(val) - 1).KeepBetween(0, lastPage)}))
											}}/>
										<Button text={<Icon icon="arrow-right" size={15}/>} title="Next page"
											enabled={page < lastPage} onClick={()=> {
												store.dispatch(new ACTMapNodeListPageSet({mapID: map._id, page: page + 1}));
											}}/>
									</Row>
									<Div mlr="auto"/>
									<Pre>Filter:</Pre>
									<InfoButton text="Hides nodes without the given text. Regular expressions can be used, ex: /there are [0-9]+ dimensions/"/>
									<TextInput ml={2} value={filter} onChange={val=>store.dispatch(new ACTMapNodeListFilterSet({mapID: map._id, filter: val}))}/>*/}
									<Button ml="auto" text="Add layer" onClick={()=> {
										if (userID == null) return ShowSignInPopup();
										ShowAddLayerDialog(userID);
									}}/>
								</Row>
								<Row style={{position: "relative", height: 40, padding: 10}}>
									<span style={{position: "absolute", right: 27, top: 3, fontSize: 13}}>Enabled for...</span>
									<span style={{flex: columnWidths[0], fontWeight: 500, fontSize: 17}}>Title</span>
									<span style={{flex: columnWidths[1], fontWeight: 500, fontSize: 17}}>Creator</span>
									<span style={{flex: columnWidths[2], marginTop: 15, fontWeight: 500, fontSize: 15}}>Map</span>
									<span style={{flex: columnWidths[3], marginTop: 15, fontWeight: 500, fontSize: 15}}>User</span>
								</Row>
							</Column>
							<ScrollView style={{flex: 1}} contentStyle={{flex: 1}}>
								{layers.length == 0 && <div style={{textAlign: "center", fontSize: 18}}>Loading...</div>}
								{layers.map((layer, index)=> {
									return <LayerUI key={layer._id} index={index} last={index == layers.length - 1} map={map} layer={layer}/>
								})}
							</ScrollView>
						</Column>
						{false &&
							<Column style={{width: 400}}>
							</Column>}
					</Row>
				</DropDownContent>
			</DropDown>
		);
	}
}

type LayerUIProps = {index: number, last: boolean, map: Map, layer: Layer} & Partial<{creator: User, userLayerState: boolean}>;
@Connect((state, {map, layer}: LayerUIProps)=> ({
	creator: layer && GetUser(layer.creator),
	userLayerState: GetUserLayerStateForMap(GetUserID(), map._id, layer._id),
}))
class LayerUI extends BaseComponent<LayerUIProps, {}> {
	render() {
		let {index, last, map, layer, creator, userLayerState} = this.props;
		let creatorOrMod = IsUserCreatorOrMod(GetUserID(), map);
		let deleteLayerError = ForDeleteLayer_GetError(GetUserID(), layer);
		return (
			<Column p="7px 10px" style={E(
				{background: index % 2 == 0 ? "rgba(30,30,30,.7)" : "rgba(0,0,0,.7)"},
				last && {borderRadius: "0 0 10px 10px"}
			)}>
				<Row>
					<span style={{flex: columnWidths[0]}}>
						{layer.name}
						{creator && creator._key == GetUserID() &&
							<Button text="X" ml={5} style={{padding: "3px 5px"}} enabled={deleteLayerError == null} title={deleteLayerError}
								onClick={()=> {
									ShowMessageBox({
										title: `Delete "${layer.name}"`, cancelButton: true,
										message: `Delete the layer "${layer.name}"?`,
										onOK: async ()=> {
											new DeleteLayer({layerID: layer._id}).Run();
										}
									});
								}}/>}
					</span>
					<span style={{flex: columnWidths[1]}}>{creator ? creator.displayName : "..."}</span>
					<span style={{flex: columnWidths[2]}}>
						<CheckBox enabled={creatorOrMod} checked={GetMapLayerIDs(map).Contains(layer._id)} onChange={val=> {
							new SetLayerAttachedToMap({mapID: map._id, layerID: layer._id, attached: val}).Run();
						}}/>
					</span>
					<span style={{flex: columnWidths[3]}}>
						<CheckBox checked={userLayerState} indeterminate={userLayerState == null} onChange={val=> {
							if (GetUserID() == null) return ShowSignInPopup();
							let newState =
								userLayerState == null ? true :
								userLayerState == true ? false :
								null;
							new SetMapLayerStateForUser({userID: GetUserID(), mapID: map._id, layerID: layer._id, state: newState}).Run();
						}}/>
					</span>
				</Row>
			</Column>
		);
	}
}