import React from "react";
import {store} from "Store";
import {SubNavBar, SubNavBarButton} from "web-vcore";
import {Switch} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {GADDemo_2020, GetGADExternalSiteURL} from "./GAD.js";
import {HomeUI2_GAD, HomeUI2_GAD2020} from "./Home2_GAD.js";

export class HomeUI_GAD extends BaseComponentPlus({}, {}) {
	render() {
		const currentSubpage = store.main.home.subpage;
		const page = "home";

		return (
			<>
				<SubNavBar>
					<SubNavBarButton page={page} subpage='home' text='Home'/>
					{!GADDemo_2020 && <SubNavBarButton to={GetGADExternalSiteURL()} page={page} subpage='about' text='About'/>}
				</SubNavBar>
				<Switch>
					{GADDemo_2020 && <HomeUI2_GAD2020/>}
					{!GADDemo_2020 && <HomeUI2_GAD/>}
				</Switch>
			</>
		);
	}
}