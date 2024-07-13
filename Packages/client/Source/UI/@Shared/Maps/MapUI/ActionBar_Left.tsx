import {E} from "js-vextensions";
import {runInAction} from "mobx";
import {Button, Row} from "react-vcomponents";
import {BaseComponentPlus} from "react-vextensions";
import {store} from "Store";
import {GetTimelinePanelOpen, GetMapState} from "Store/main/maps/mapStates/$mapState.js";
import {SLMode, SLMode_2020, SLMode_Climate} from "UI/@SL/SL.js";
import {HSLA, Observer, RunInAction} from "web-vcore";
import {Map, MeID, IsUserCreatorOrMod, IsUserMap} from "dm_common";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {Button_SL} from "UI/@SL/SLButton.js";
import {liveSkin} from "Utils/Styles/SkinManager";
import {DetailsDropDown} from "./ActionBar_Left/DetailsDropDown.js";
import {PeopleDropDown} from "./ActionBar_Left/PeopleDropDown.js";

export const actionBarHeight = SLMode ? 40 : 30;

@Observer
export class ActionBar_Left extends BaseComponentPlus({} as {map: Map, subNavBarWidth: number, backOnly?: boolean}, {}) {
	render() {
		const {map, subNavBarWidth, backOnly} = this.props;
		const userID = MeID();
		IsUserCreatorOrMod(userID, map);
		const timelinePanelOpen = GetTimelinePanelOpen(map.id);

		const Button_Final = SLMode ? Button_SL : Button;
		return (
			<nav style={{
				position: "absolute", zIndex: zIndexes.actionBar, left: 0, width: `calc(50% - ${subNavBarWidth / 2}px)`, top: 0, textAlign: "center",
				// background: "rgba(0,0,0,.5)", boxShadow: "3px 3px 7px rgba(0,0,0,.07)",
			}}>
				<Row center style={E(
					{
						justifyContent: "flex-start", background: liveSkin.NavBarPanelBackgroundColor().css(), boxShadow: liveSkin.NavBarBoxShadow(),
						width: "100%", height: actionBarHeight, borderRadius: "0 0 10px 0",
					},
					SLMode && {
						background: HSLA(0, 0, 1, 1),
						boxShadow: "rgba(100, 100, 100, .3) 0px 0px 3px, rgba(70,70,70,.5) 0px 0px 150px",
						// boxShadow: null,
						// filter: 'drop-shadow(rgba(0,0,0,.5) 0px 0px 10px)',
					},
				)}>
					{IsUserMap(map) && !SLMode_2020 && !SLMode_Climate &&
						<Button_Final text="Back" style={{height: "100%"}} onClick={()=>{
							RunInAction("ActionBar_Left.Back.onClick", ()=>{
								store.main.debates.selectedMapID = null;
							});
						}}/>}
					{!backOnly && <>
						{IsUserMap(map) && <DetailsDropDown map={map}/>}
						{IsUserMap(map) && <PeopleDropDown map={map}/>}
						{/* // disabled for now, so we can iterate quickly on the stuff we're actually using right now
						{IsUserMap(map) && HasModPermissions(MeID()) && <LayersDropDown map={map}/>} */}
						{/* IsUserMap(map) && HasModPermissions(MeID()) && <TimelineDropDown map={map}/> */}
						{IsUserMap(map) && !SLMode &&
							<Button ml={5} text="Timelines" style={{height: "100%"}} onClick={()=>{
								RunInAction("ActionBar_Left.Timelines.onClick", ()=>{
									GetMapState.NN(map.id).timelinePanelOpen = !timelinePanelOpen;
								});
							}}/>}
					</>}
				</Row>
			</nav>
		);
	}
}