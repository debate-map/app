import {E} from "js-vextensions";
import {runInAction} from "mobx";
import {Button, Row} from "react-vcomponents";
import {BaseComponentPlus} from "react-vextensions";
import {store} from "Store";
import {MeID} from "Store/firebase/users";
import {GetTimelinePanelOpen, GetMapState} from "Store/main/maps/mapStates/$mapState";
import {GADDemo} from "UI/@GAD/GAD";
import {HSLA, Observer} from "vwebapp-framework";
import {IsUserCreatorOrMod} from "Store/firebase/users/$user";
import {IsUserMap} from "../../../../Store/firebase/maps/$map";
import {Map, MapType} from "../../../../Store/firebase/maps/@Map";
import {colors} from "../../../../Utils/UI/GlobalStyles";
import {DetailsDropDown} from "./ActionBar_Left/DetailsDropDown";
import {PeopleDropDown} from "./ActionBar_Left/PeopleDropDown";

@Observer
export class ActionBar_Left extends BaseComponentPlus({} as {map: Map, subNavBarWidth: number}, {}) {
	render() {
		const {map, subNavBarWidth} = this.props;
		const userID = MeID();
		IsUserCreatorOrMod(userID, map);
		const timelinePanelOpen = GetTimelinePanelOpen(map._key);

		return (
			<nav style={{
				position: "absolute", zIndex: 1, left: 0, width: `calc(50% - ${subNavBarWidth / 2}px)`, top: 0, textAlign: "center",
				// background: "rgba(0,0,0,.5)", boxShadow: "3px 3px 7px rgba(0,0,0,.07)",
			}}>
				<Row center style={E(
					{
						justifyContent: "flex-start", background: "rgba(0,0,0,.7)", boxShadow: colors.navBarBoxShadow,
						width: "100%", height: 30, borderRadius: "0 0 10px 0",
					},
					GADDemo && {
						background: HSLA(0, 0, 1, 1),
						boxShadow: "rgba(100, 100, 100, .3) 0px 0px 3px, rgba(70,70,70,.5) 0px 0px 150px",
						// boxShadow: null,
						// filter: 'drop-shadow(rgba(0,0,0,.5) 0px 0px 10px)',
					},
				)}>
					{IsUserMap(map) &&
						<Button text="Back" style={{height: "100%"}} onClick={()=>{
							runInAction("ActionBar_Left.Back.onClick", ()=>{
								store.main[map.type == MapType.Private ? "private" : "public"].selectedMapID = null;
							});
						}}/>}
					{IsUserMap(map) && <DetailsDropDown map={map}/>}
					{map.type == MapType.Private && <PeopleDropDown map={map}/>}
					{/* // disabled for now, so we can iterate quickly on the stuff we're actually using right now
					{IsUserMap(map) && HasModPermissions(MeID()) && <LayersDropDown map={map}/>} */}
					{/* IsUserMap(map) && HasModPermissions(MeID()) && <TimelineDropDown map={map}/> */}
					{IsUserMap(map) && !GADDemo &&
						<Button ml={5} text="Timelines" style={{height: "100%"}} onClick={()=>{
							runInAction("ActionBar_Left.Timelines.onClick", ()=>{
								GetMapState(map._key).timelinePanelOpen = !timelinePanelOpen;
							});
						}}/>}
				</Row>
			</nav>
		);
	}
}