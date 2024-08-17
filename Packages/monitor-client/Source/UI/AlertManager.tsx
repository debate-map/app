import {GetServerURL} from "dm_common";
import React, {useEffect} from "react";
import {store} from "Store";
import {Observer} from "web-vcore";
import {Column} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";
import {CookieTransferHelper} from "./@Shared/CookieTransferHelper.js";

@Observer
export class AlertManagerUI extends BaseComponent<{}, {}> {
	render() {
		let {} = this.props;
		const adminKey = store.main.adminKey;

		return (
			<Column style={{flex: 1, height: "100%"}}>
				<CookieTransferHelper adminKey={adminKey}>
					<iframe src={GetServerURL("monitor", `/proxy/alertmanager`, {restrictToRecognizedHosts: true, claimedClientURL: window.location.href})} style={{height: "100%"}}/>
				</CookieTransferHelper>
			</Column>
		);
	}
}