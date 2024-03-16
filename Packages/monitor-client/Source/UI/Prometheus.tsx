import {GetServerURL} from "dm_common";
import React from "react";
import {store} from "Store";
import {Observer} from "web-vcore";
import {Column} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {CookieTransferHelper} from "./@Shared/CookieTransferHelper.js";

@Observer
export class PrometheusUI extends BaseComponent<{}, {}> {
	render() {
		let {} = this.props;
		const adminKey = store.main.adminKey;

		return (
			<Column style={{flex: 1, height: "100%"}}>
				<CookieTransferHelper adminKey={adminKey}>
					<iframe src={GetServerURL("monitor", `/proxy/prometheus/graph`, {restrictToRecognizedHosts: true, claimedClientURL: window.location.href})} style={{height: "100%"}}/>
				</CookieTransferHelper>
			</Column>
		);
	}
}