import {GetServerURL} from "dm_common";
import React from "react";
import {Observer} from "web-vcore";
import {Column} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";

@Observer
export class PyroscopeUI extends BaseComponent<{}, {}> {
	render() {
		let {} = this.props;

		return (
			<Column style={{flex: 1, height: "100%"}}>
				<iframe src={GetServerURL("pyroscope", "/", {restrictToRecognizedHosts: true, claimedClientURL: window.location.href})} style={{height: "100%"}}/>
			</Column>
		);
	}
}