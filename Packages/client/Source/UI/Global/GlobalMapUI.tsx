import {BaseComponentPlus} from "react-vextensions";
import {PageContainer, Observer} from "web-vcore";
import {GetMap, globalMapID} from "dm_common";
import {MapUIWrapper} from "UI/@Shared/Maps/MapUIWrapper.js";
import {MapUI} from "../@Shared/Maps/MapUI.js";

@Observer
export class GlobalMapUI extends BaseComponentPlus({} as {}, {}) {
	render() {
		/*const map = GetMap(globalMapID);
		if (map == null) return null;*/
		return (
			<PageContainer preset="full" style={{margin: 0}}>
				<MapUIWrapper mapID={globalMapID} /*subNavBarWidth={/* 104 *#/ 54}*//>
			</PageContainer>
		);
	}
}