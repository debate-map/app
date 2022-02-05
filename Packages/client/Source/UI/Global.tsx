import {Switch} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {store} from "Store";
import {SubNavBar, SubNavBarButton} from "web-vcore";
import {GlobalMapUI} from "./Global/GlobalMapUI.js";

export class GlobalUI extends BaseComponentPlus({} as {}, {}) {
	render() {
		const currentSubpage = store.main.global.subpage;
		const page = "global";
		return (
			<>
				<SubNavBar>
					<SubNavBarButton page={page} subpage="map" text="Map"/>
				</SubNavBar>
				<Switch>
					<GlobalMapUI/>
				</Switch>
			</>
		);
	}
}