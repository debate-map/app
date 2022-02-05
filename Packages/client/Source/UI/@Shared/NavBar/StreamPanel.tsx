import React from "react";
import {StreamUI} from "UI/Social/StreamUI";
import {BaseComponent, SimpleShouldUpdate} from "web-vcore/nm/react-vextensions.js";
import {liveSkin} from "Utils/Styles/SkinManager";

export class StreamPanel extends BaseComponent<{auth?}, {}> {
	render() {
		return (
			<div style={{display: "flex", flexDirection: "column", width: 800, padding: 5, background: liveSkin.OverlayPanelBackgroundColor().css(), borderRadius: "0 0 5px 0"}}>
				<StreamUI panel={true}/>
			</div>
		);
	}
}