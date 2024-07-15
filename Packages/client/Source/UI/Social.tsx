import {ScrollView} from "react-vscrollview";
import {BaseComponent, BaseComponentPlus} from "react-vextensions";
import {VReactMarkdown_Remarkable, PageContainer, Observer, SubNavBarButton, SubNavBar} from "web-vcore";
import React from "react";
import {Switch} from "react-vcomponents";
import {StreamUI} from "./Social/StreamUI";
import {store} from "../Store/index.js";

@Observer
export class SocialUI extends BaseComponentPlus({} as {}, {}) {
	render() {
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
	}
}

export class StreamPage extends BaseComponent<{}, {}> {
	render() {
		return (
			<PageContainer scrollable={true}>
				<StreamUI/>
			</PageContainer>
		);
	}
}