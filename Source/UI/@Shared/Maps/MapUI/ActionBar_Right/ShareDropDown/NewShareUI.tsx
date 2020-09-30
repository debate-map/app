import {GetMap, GetMapTimelines, Share, ShareType, Timeline, GetShares, MeID, UpdateShare, AddShare, GetNodesInSubtree, MapView} from "@debate-map/server-link/Source/Link";
import {CopyText, GetEntries, ToJSON, WaitXThenRun, VURL, ModifyString, Clone, IsObject, GetTreeNodesInObjTree, CE} from "js-vextensions";
import {Button, CheckBox, Column, Pre, Row, RowLR, Select, Text, TextArea, TextInput} from "react-vcomponents";
import {BaseComponentPlus} from "react-vextensions";
import {store} from "Store";
import {GetMapView} from "Store/main/maps/mapViews/$mapView";
import {ExpandType, ScrollToType} from "Store/main/shareUI";
import {GetNewURL} from "Utils/URL/URLs";
import {GetCurrentURL, Observer, RunInAction_Set, GetUpdates} from "vwebapp-framework";
import {GetShareLongURL, GetShareShortURL} from "../ShareDropDown";
import {WithFirestoreNormalization} from "mobx-firelink";

@Observer
export class NewShareUI extends BaseComponentPlus({} as {mapID: string}, {timeline: null as Timeline, justCopied_type: null as string}) {
	render() {
		const {mapID} = this.props;
		const {timeline, justCopied_type} = this.state;
		const uiState = store.main.shareUI;
		const userSharesForMap = GetShares(MeID(), mapID);
		
		const currentShare = userSharesForMap.OrderByDescending(a=>a.createdAt)[0];
		const currentShare_shortURL = GetShareShortURL(currentShare);
		const currentShare_longURL = GetShareLongURL(currentShare);

		const map = GetMap(mapID);
		const timelines = GetMapTimelines(map);

		const newShareData = new Share({
			name: map.name,
			type: ShareType.Map,
			mapID,
			mapView: GetMapView(mapID),
			createdAt: Date.now(), // overridden by server, but added for informational convenience, for mere copy-pastes
		});
		/*if (uiState.expandType == ExpandType.MapDefault) {
			// todo
		} else if (uiState.expandType == ExpandType.ToSelectedNode) {
			// todo
		}*/
		const newShareJSON = ToJSON(newShareData, null, 2);
		//const newShare_updatesFromCurrent = GetUpdates(currentShare, newShareData, true).Including("mapView");
		const newShare_updatesFromCurrent = {};
		if (currentShare) {
			const currentMapView_normalized = WithFirestoreNormalization(currentShare.mapView);
			const newMapView_normalized = WithFirestoreNormalization(newShareData.mapView);
			/*const mapViewChanges = GetUpdates(currentMapView_normalized, newMapView_normalized, true);
			if (mapViewChanges.length) {*/
			if (ToJSON(newMapView_normalized) != ToJSON(currentMapView_normalized)) {
				newShare_updatesFromCurrent["mapView"] = newShareData.mapView;
			}
		}

		const splitAt = 120;
		return (
			<Column>
				<RowLR splitAt={splitAt}>
					<Text>Show timeline:</Text>
					<Select options={[{name: "None", value: null} as any].concat(timelines)} value={timeline} onChange={val=>this.SetState({timeline: val})}/>
				</RowLR>
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
					<Button text="Update current" enabled={currentShare != null && newShare_updatesFromCurrent.VKeys().length > 0} onClick={()=>{
						new UpdateShare({id: currentShare._key, updates: newShare_updatesFromCurrent}).Run();
					}}/>
					<Button ml={5} text="Create new share" onClick={()=>{
						const share = new Share(newShareData);
						new AddShare({share}).Run();
					}}/>
					<Text ml={5}>Changes: {currentShare == null ? "n/a" : (newShare_updatesFromCurrent.VKeys().length ? newShare_updatesFromCurrent.VKeys().join(", ") : "none")}</Text>
				</Row>

				<Row mt={15}>
					<Text>Current share ID: {currentShare?._key ?? "none"}</Text>
				</Row>
				<RowLR mt={5} splitAt={80}>
					<Text>Name:</Text>
					<TextInput enabled={currentShare != null} style={{flex: 1}} value={currentShare?.name ?? ""} onChange={val=>{
						new UpdateShare({id: currentShare._key, updates: {name: val}}).Run();
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
			</Column>
		);
	}
}