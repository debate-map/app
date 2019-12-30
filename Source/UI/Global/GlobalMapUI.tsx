import {BaseComponentPlus} from "react-vextensions";
import {globalMapID} from "Store/firebase/nodes/@MapNode";
import {PageContainer, Observer} from "vwebapp-framework";
import {GetMap} from "../../Store/firebase/maps";
import {MapUI} from "../@Shared/Maps/MapUI";

@Observer
export class GlobalMapUI extends BaseComponentPlus({} as {}, {}) {
	render() {
		const map = GetMap(globalMapID);
		if (map == null) return null;
		return (
			<PageContainer fullWidth={true} fullHeight={true} style={{margin: 0, padding: 0, background: null, filter: null}}>
				<MapUI map={map} subNavBarWidth={/* 104 */ 54}/>
			</PageContainer>
		);
	}
}