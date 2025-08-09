import {PageContainer, SubNavBarButton, SubNavBar} from "web-vcore";
import {StreamUI} from "./Social/StreamUI";
import React from "react";
import {Switch} from "react-vcomponents";
import {store} from "../Store/index.js";
import {observer_mgl} from "mobx-graphlink";

export const SocialUI = observer_mgl(()=>{
	const currentSubpage = store.main.social.subpage;
	const page = "social";
	return (
		<>
			<SubNavBar>
				<SubNavBarButton page={page} subpage="stream" text="Stream"/>
			</SubNavBar>
			<Switch>
				<StreamPage/>
			</Switch>
		</>
	);
});

export const StreamPage = ()=>{
	return (
		<PageContainer scrollable={true}>
			<StreamUI/>
		</PageContainer>
	);
};
