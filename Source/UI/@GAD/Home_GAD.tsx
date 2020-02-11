import {Switch} from "react-vcomponents";
import {BaseComponent, BaseComponentPlus} from "react-vextensions";
import {store} from "Source/Store";
import {SubNavBarButton_GAD, SubNavBar_GAD} from "./SubNavBar_GAD";
import {HomeUI2_GAD} from "./Home2_GAD";

export class HomeUI_GAD extends BaseComponentPlus({}, {}) {
	render() {
		const currentSubpage = store.main.home.subpage;
		const page = "home";
		const gad = startURL.GetQueryVar("extra") == "gad";

		return (
			<>
				<SubNavBar_GAD>
					<SubNavBarButton_GAD page={page} subpage='home' text='Home' />
					<SubNavBarButton_GAD page={page} subpage='about' text='About' />
				</SubNavBar_GAD>
				<Switch>
					<HomeUI2_GAD />
				</Switch>
			</>
		);
	}
}