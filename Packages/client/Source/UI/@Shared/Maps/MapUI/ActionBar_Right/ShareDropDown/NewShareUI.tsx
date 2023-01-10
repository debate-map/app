import {AddShare, GetMap, GetShares, MeID, Share, ShareType, Timeline, UpdateShare} from "dm_common";
import {store} from "Store";
import {GetMapView} from "Store/main/maps/mapViews/$mapView.js";
import {ExpandType, ScrollToType} from "Store/main/shareUI.js";
import {RunCommand_AddShare, RunCommand_UpdateShare} from "Utils/DB/Command.js";
import {Observer, RunInAction_Set} from "web-vcore";
import {CopyText, GetEntries, ToJSON, WaitXThenRun} from "web-vcore/nm/js-vextensions.js";
import {Button, CheckBox, Column, Pre, Row, RowLR, Select, Text, TextArea, TextInput} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {GetShareLongURL, GetShareShortURL} from "../ShareDropDown.js";

@Observer
export class NewShareUI extends BaseComponentPlus({} as {mapID: string}, {timeline: null as Timeline|n, justCopied_type: null as string|n}) {
	render() {
		const {mapID} = this.props;
		const {timeline, justCopied_type} = this.state;
		const uiState = store.main.shareUI;
		const userSharesForMap = GetShares(MeID.NN(), mapID);

		const currentShare = userSharesForMap.OrderByDescending(a=>a.createdAt)[0];
		const currentShare_shortURL = GetShareShortURL(currentShare);
		const currentShare_longURL = GetShareLongURL(currentShare);

		const map = GetMap.NN(mapID);
		//const timelines = GetMapTimelines(map);

		const newShareData = new Share({
			name: map.name,
			type: ShareType.map,
			mapID,
			mapView: GetMapView(mapID),
		});
		Object.defineProperty(newShareData, "createdAt", {enumerable: false, value: Date.now()}); // overridden by server, but added for informational convenience, for mere copy-pastes
		/*if (uiState.expandType == ExpandType.MapDefault) {
			// todo
		} else if (uiState.expandType == ExpandType.ToSelectedNode) {
			// todo
		}*/
		const newShareJSON = ToJSON(newShareData, undefined, 2);
		//const newShare_updatesFromCurrent = GetUpdates(currentShare, newShareData, true).IncludeKeys("mapView");
		const newShare_updatesFromCurrent = {};
		if (currentShare) {
			/*const currentMapView_normalized = WithFirestoreNormalization(currentShare.mapView);
			const newMapView_normalized = WithFirestoreNormalization(newShareData.mapView);*/
			const currentMapView_normalized = currentShare.mapView;
			const newMapView_normalized = newShareData.mapView;
			/*const mapViewChanges = GetUpdates(currentMapView_normalized, newMapView_normalized, true);
			if (mapViewChanges.length) {*/
			if (ToJSON(newMapView_normalized) != ToJSON(currentMapView_normalized)) {
				newShare_updatesFromCurrent["mapView"] = newShareData.mapView;
			}
		}

		const splitAt = 120;
		return (
			<Column>
				{/*<RowLR splitAt={splitAt}>
					<Text>Show timeline:</Text>
					<Select options={[{name: "None", value: null} as any].concat(timelines)} value={timeline} onChange={val=>this.SetState({timeline: val})}/>
				</RowLR>*/}
				<RowLR mt={5} splitAt={splitAt}>
					<Text>Expand type:</Text>
					<Select options={GetEntries(ExpandType, "ui")}
						value={uiState.expandType} onChange={val=>RunInAction_Set(this, ()=>uiState.expandType = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt}>
					<Text>Scroll-to type:</Text>
					<Select options={GetEntries(ScrollToType, "ui")}
						value={uiState.scrollToType} onChange={val=>RunInAction_Set(this, ()=>uiState.scrollToType = val)}/>
				</RowLR>
				<Row mt={5}>
					<CheckBox text="Show new JSON" value={uiState.showJSON} onChange={val=>RunInAction_Set(this, ()=>uiState.showJSON = val)}/>
				</Row>
				{uiState.showJSON &&
				<Row>
					<TextArea style={{height: 200, resize: "vertical"}} editable={false} value={newShareJSON}/>
				</Row>}
				<Row mt={5}>
					<Button text="Update current" enabled={currentShare != null && newShare_updatesFromCurrent.VKeys().length > 0} onClick={async()=>{
						//new UpdateShare({id: currentShare.id, updates: newShare_updatesFromCurrent}).RunOnServer();
						await RunCommand_UpdateShare({id: currentShare.id, updates: newShare_updatesFromCurrent});
					}}/>
					<Button ml={5} text="Create new share" onClick={async()=>{
						const share = new Share(newShareData);
						//new AddShare({share}).RunOnServer();
						await RunCommand_AddShare(share);
					}}/>
					<Text ml={5}>Changes: {currentShare == null ? "n/a" : (newShare_updatesFromCurrent.VKeys().length ? newShare_updatesFromCurrent.VKeys().join(", ") : "none")}</Text>
				</Row>

				{currentShare &&
				<>
					<Row mt={15}>
						<Text>Current share ID: {currentShare?.id ?? "none"}</Text>
					</Row>
					<RowLR mt={5} splitAt={80}>
						<Text>Name:</Text>
						<TextInput enabled={currentShare != null} style={{flex: 1}} value={currentShare?.name ?? ""} onChange={async val=>{
							//new UpdateShare({id: currentShare.id, updates: {name: val}}).RunOnServer();
							await RunCommand_UpdateShare({id: currentShare.id, updates: {name: val}});
						}}/>
					</RowLR>
					<RowLR mt={5} splitAt={80}>
						<Pre>Short URL: </Pre>
						<Row style={{width: "100%"}}>
							<TextInput value={currentShare_shortURL.toString({domain: true})} editable={false} style={{flex: 1}}/>
							<Button text={justCopied_type == "short" ? "Copied!" : "Copy"} ml={5} enabled={currentShare != null} onClick={()=>{
								CopyText(currentShare_shortURL.toString({domain: true}));
								this.SetState({justCopied_type: "short"});
								WaitXThenRun(1000, ()=>this.SetState({justCopied_type: null}));
							}}/>
						</Row>
					</RowLR>
					<RowLR mt={5} splitAt={80}>
						<Pre>Long URL: </Pre>
						<Row style={{width: "100%"}}>
							<TextInput value={currentShare_longURL.toString({domain: true})} editable={false} style={{flex: 1}}/>
							<Button text={justCopied_type == "long" ? "Copied!" : "Copy"} ml={5} enabled={currentShare != null} onClick={()=>{
								CopyText(currentShare_longURL.toString({domain: true}));
								this.SetState({justCopied_type: "long"});
								WaitXThenRun(1000, ()=>this.SetState({justCopied_type: null}));
							}}/>
						</Row>
					</RowLR>
				</>}
			</Column>
		);
	}
}