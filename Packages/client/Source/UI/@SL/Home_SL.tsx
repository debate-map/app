import React from "react";
import {SubNavBar, SubNavBarButton} from "web-vcore";
import {Switch} from "react-vcomponents";
import {SLMode_2020, SLMode_AI, GetGADExternalSiteURL} from "./SL.js";
import {HomeUI2_SL} from "./Home2_SL.js";

export const HomeUI_SL = ()=>{
	const page = "home";

	return (
		<>
			<SubNavBar>
				<SubNavBarButton page={page} subpage='home' text='Home'/>
				{!SLMode_2020 && !SLMode_AI && <SubNavBarButton to={GetGADExternalSiteURL()} page={page} subpage='about' text='About'/>}
			</SubNavBar>
			<Switch>
				<HomeUI2_SL/>
			</Switch>
		</>
	);
}
