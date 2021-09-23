import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {PageContainer, Observer} from "web-vcore";
import {GetMap} from "dm_common";
import {globalMapID} from "dm_common";
import {MapUI} from "../@Shared/Maps/MapUI.js";

@Observer
export class GlobalMapUI extends BaseComponentPlus({} as {}, {}) {
	render() {
		/*const map = GetMap(globalMapID);
		if (map == null) return null;*/
		return (
			<PageContainer preset="full" style={{margin: 0}}>
				<MapUI mapID={globalMapID} subNavBarWidth={/* 104 */ 54}/>
			</PageContainer>
		);
	}
}