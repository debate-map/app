import {MapType, Map} from "../../Store/firebase/maps/@Map";
import {MapView} from "../../Store/main/mapViews/@MapViews";

export var demoRootNodeID = DEV ? 1 : 463; // hard-coded for now
export var demoMap = {_id: -100, name: `Demo`, type: MapType.Personal, rootNode: demoRootNodeID} as Map;
export function CreateDemoMapView(): MapView {
	return {rootNodeViews: {
		[demoRootNodeID]: {
			expanded: true,
		}
	}};
}