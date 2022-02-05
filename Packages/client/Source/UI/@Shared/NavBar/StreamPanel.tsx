import React from "react";
import {StreamUI} from "UI/Social/StreamUI";
import {BaseComponent, SimpleShouldUpdate} from "web-vcore/nm/react-vextensions.js";
import {liveSkin} from "Utils/Styles/SkinManager";

export class StreamPanel extends BaseComponent<{auth?}, {}> {
	render() {
		return (
			<div style={{
				display: "flex", flexDirection: "column", width: 800, padding: 5, borderRadius: "0 0 5px 0",
				background: liveSkin.NavBarPanelBackgroundColor().css(), border: liveSkin.OverlayBorder(),
			}}>
				<StreamUI panel={true}/>
			</div>
		);
	}
}