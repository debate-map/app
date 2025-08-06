import React from "react";
import {Switch} from "react-vcomponents";
import {store} from "Store";
import {SubNavBar, SubNavBarButton} from "web-vcore";
import {AboutUI} from "./Home/About.js";
import {HomeUI2} from "./Home/Home.js";
import {observer_mgl} from "mobx-graphlink";

export const HomeUI = observer_mgl(()=>{
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
});
