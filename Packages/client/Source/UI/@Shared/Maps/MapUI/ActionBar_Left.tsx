import {E} from "web-vcore/nm/js-vextensions.js";
import {runInAction} from "web-vcore/nm/mobx.js";
import {Button, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {store} from "Store";
import {GetTimelinePanelOpen, GetMapState} from "Store/main/maps/mapStates/$mapState.js";
import {GADDemo, GADDemo_2020} from "UI/@GAD/GAD.js";
import {HSLA, Observer, RunInAction} from "web-vcore";
import {Map, MeID, IsUserCreatorOrMod, IsUserMap} from "dm_common";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {Button_GAD} from "UI/@GAD/GADButton.js";
import {colors} from "../../../../Utils/UI/GlobalStyles.js";
import {DetailsDropDown} from "./ActionBar_Left/DetailsDropDown.js";
import {PeopleDropDown} from "./ActionBar_Left/PeopleDropDown.js";

@Observer
export class ActionBar_Left extends BaseComponentPlus({} as {map: Map, subNavBarWidth: number, backOnly?: boolean}, {}) {
	render() {
		const {map, subNavBarWidth, backOnly} = this.props;
		const userID = MeID();
		IsUserCreatorOrMod(userID, map);
		const timelinePanelOpen = GetTimelinePanelOpen(map.id);

		const Button_Final = GADDemo ? Button_GAD : Button;
		return (
			<nav style={{
				position: "absolute", zIndex: zIndexes.actionBar, left: 0, width: `calc(50% - ${subNavBarWidth / 2}px)`, top: 0, textAlign: "center",
				// background: "rgba(0,0,0,.5)", boxShadow: "3px 3px 7px rgba(0,0,0,.07)",
			}}>
				<Row center style={E(
					{
						justifyContent: "flex-start", background: "rgba(0,0,0,.7)", boxShadow: colors.navBarBoxShadow,
						width: "100%", height: GADDemo ? 40 : 30, borderRadius: "0 0 10px 0",
					},
					GADDemo && {
						background: HSLA(0, 0, 1, 1),
						boxShadow: "rgba(100, 100, 100, .3) 0px 0px 3px, rgba(70,70,70,.5) 0px 0px 150px",
						// boxShadow: null,
						// filter: 'drop-shadow(rgba(0,0,0,.5) 0px 0px 10px)',
					},
				)}>
					{IsUserMap(map) && !GADDemo_2020 &&
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
						{/*IsUserMap(map) && !GADDemo &&
							<Button ml={5} text="Timelines" style={{height: "100%"}} onClick={()=>{
								RunInAction("ActionBar_Left.Timelines.onClick", ()=>{
									GetMapState.NN(map.id).timelinePanelOpen = !timelinePanelOpen;
								});
							}}/>*/}
					</>}
				</Row>
			</nav>
		);
	}
}