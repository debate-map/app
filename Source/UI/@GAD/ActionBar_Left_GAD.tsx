import {BaseComponentWithConnector, BaseComponentPlus} from "react-vextensions";
import {Row, Button} from "react-vcomponents";
import {colors} from "Source/Utils/UI/GlobalStyles";
import {LayoutDropDown} from "Source/UI/@Shared/Maps/MapUI/ActionBar_Right/LayoutDropDown";
import {GetTimelinePanelOpen} from "Source/Store/main/maps/mapStates/$mapState";
import {HSLA, Observer} from "vwebapp-framework";
import {store} from "Source/Store";
import {runInAction} from "mobx";
import {E} from "js-vextensions";
import {DetailsDropDown} from "Source/UI/@Shared/Maps/MapUI/ActionBar_Left/DetailsDropDown";
import {zIndexes} from "Source/Utils/UI/ZIndexes";
import {Map, MapType} from "@debate-map/server-link/Source/Link";
import {MeID} from "@debate-map/server-link/Source/Link";
import {IsUserCreatorOrMod} from "@debate-map/server-link/Source/Link";
import {IsUserMap} from "@debate-map/server-link/Source/Link";
import {Button_GAD} from "./GADButton";

@Observer
export class ActionBar_Left_GAD extends BaseComponentPlus({} as {map: Map, subNavBarWidth: number}, {}) {
	render() {
		const {map, subNavBarWidth} = this.props;
		const userID = MeID();
		IsUserCreatorOrMod(userID, map);
		// const timelinePanelOpen = GetTimelinePanelOpen(map._key);

		return (
			<nav style={{
				position: "absolute", zIndex: zIndexes.actionBar, left: 0, width: `calc(50% - ${subNavBarWidth / 2}px)`, top: 0, textAlign: "center",
				// background: "rgba(0,0,0,.5)", boxShadow: "3px 3px 7px rgba(0,0,0,.07)",
			}}>
				<Row center style={E(
					{
						justifyContent: "flex-start", background: "rgba(0,0,0,.7)", boxShadow: colors.navBarBoxShadow,
						width: "100%", height: 40, borderRadius: "0 0 10px 0",
					},
					{
						background: HSLA(0, 0, 1, 1),
						boxShadow: "rgba(100, 100, 100, .3) 0px 0px 3px, rgba(70,70,70,.5) 0px 0px 150px",
						// boxShadow: null,
						// filter: 'drop-shadow(rgba(0,0,0,.5) 0px 0px 10px)',
					},
				)}>
					{IsUserMap(map) &&
						<Button_GAD text="Back" onClick={()=>{
							runInAction("ActionBar_Left_GAD.Back.onClick", ()=>{
								store.main[map.type == MapType.Private ? "private" : "public"].selectedMapID = null;
							});
						}}/>}
					{IsUserMap(map) && <DetailsDropDown map={map}/>}
				</Row>
			</nav>
		);
	}
}