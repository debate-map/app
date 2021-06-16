import {Switch} from "web-vcore/nm/react-vcomponents";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions";
import {store} from "Store";
import {SubNavBarButton_GAD, SubNavBar_GAD} from "./SubNavBar_GAD";
import {HomeUI2_GAD, HomeUI2_GAD2020} from "./Home2_GAD";
import {GADDemo_2020} from "./GAD";

export class HomeUI_GAD extends BaseComponentPlus({}, {}) {
	render() {
		const currentSubpage = store.main.home.subpage;
		const page = "home";

		return (
			<>
				<SubNavBar_GAD>
					<SubNavBarButton_GAD page={page} subpage='home' text='Home'/>
					{!GADDemo_2020 && <SubNavBarButton_GAD page={page} subpage='about' text='About'/>}
				</SubNavBar_GAD>
				<Switch>
					{GADDemo_2020 && <HomeUI2_GAD2020/>}
					{!GADDemo_2020 && <HomeUI2_GAD/>}
				</Switch>
			</>
		);
	}
}