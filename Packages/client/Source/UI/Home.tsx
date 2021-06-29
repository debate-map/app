import {Switch} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {store} from "Store";
import {Observer} from "web-vcore";
import {SubNavBar, SubNavBarButton} from "./@Shared/SubNavBar.js";
import {AboutUI} from "./Home/About.js";
import {HomeUI2} from "./Home/Home.js";

@Observer
export class HomeUI extends BaseComponentPlus({} as {}, {}) {
	render() {
		const currentSubpage = store.main.home.subpage;
		const page = "home";
		return (
			<>
				<SubNavBar>
					<SubNavBarButton page={page} subpage='home' text='Home'/>
					<SubNavBarButton page={page} subpage='about' text='About'/>
				</SubNavBar>
				<Switch>
					<HomeUI2/>
					{currentSubpage === "about" && <AboutUI/>}
				</Switch>
			</>
		);
	}
}