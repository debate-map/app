import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {VReactMarkdown_Remarkable, PageContainer} from "web-vcore";
import React from "react";
import {StreamUI} from "./Social/StreamUI";

export class SocialUI extends BaseComponent<{}, {}> {
	render() {
		return (
			<PageContainer scrollable={true}>
				<StreamUI/>
			</PageContainer>
		);
	}
}