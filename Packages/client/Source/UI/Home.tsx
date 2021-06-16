import {Switch} from "react-vcomponents";
import {BaseComponentPlus} from "react-vextensions";
import {store} from "Store";
import {Observer} from "vwebapp-framework";
import {SubNavBar, SubNavBarButton} from "./@Shared/SubNavBar";
import {AboutUI} from "./Home/About";
import {HomeUI2} from "./Home/Home";

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