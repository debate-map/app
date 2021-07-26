import React from "react";
import {StreamUI} from "UI/Social/StreamUI";
import {BaseComponent, SimpleShouldUpdate} from "web-vcore/nm/react-vextensions.js";

export class StreamPanel extends BaseComponent<{auth?}, {}> {
	render() {
		return (
			<div style={{display: "flex", flexDirection: "column", width: 800, padding: 5, background: "rgba(0,0,0,.7)", borderRadius: "0 0 5px 0"}}>
				<StreamUI panel={true}/>
			</div>
		);
	}
}