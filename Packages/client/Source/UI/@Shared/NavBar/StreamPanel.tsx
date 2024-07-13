import React from "react";
import {StreamUI} from "UI/Social/StreamUI";
import {BaseComponent, SimpleShouldUpdate} from "react-vextensions";
import {liveSkin} from "Utils/Styles/SkinManager";
import {Column} from "react-vcomponents";

export class StreamPanel extends BaseComponent<{}, {}> {
	render() {
		return (
			<Column style={{
				width: 800, padding: 5, borderRadius: "0 0 5px 0",
				background: liveSkin.NavBarPanelBackgroundColor().css(), border: liveSkin.OverlayBorder(),
			}}>
				<StreamUI panel={true}/>
			</Column>
		);
	}
}