import React from "react";
import {Observer} from "web-vcore";
import {Column} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";

@Observer
export class GrafanaUI extends BaseComponent<{}, {}> {
	render() {
		let {} = this.props;

		return (
			<Column style={{flex: 1, height: "100%"}}>
				{/*<iframe src="/proxy/grafana" style={{height: "100%"}}/>*/}
				TODO
			</Column>
		);
	}
}