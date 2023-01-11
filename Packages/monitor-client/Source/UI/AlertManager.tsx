import {GetServerURL} from "dm_common";
import React from "react";
import {store} from "Store";
import {Observer} from "web-vcore";
import {Column} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";

@Observer
export class AlertManagerUI extends BaseComponent<{}, {}> {
	render() {
		let {} = this.props;
		const adminKey = store.main.adminKey;

		// todo: probably make-so admin-key is passed in a header instead, for lower chance of leakage (see: https://stackoverflow.com/questions/13432821)
		return (
			<Column style={{flex: 1, height: "100%"}}>
				<iframe src={GetServerURL("monitor", `/proxy/alertmanager/${window.btoa(adminKey)}`, window.location.href)} style={{height: "100%"}}/>
			</Column>
		);
	}
}