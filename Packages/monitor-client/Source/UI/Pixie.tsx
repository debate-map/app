import React from "react";
import {Observer} from "web-vcore";
import {Column} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";

@Observer
export class PixieUI extends BaseComponent<{}, {}> {
	render() {
		let {} = this.props;

		return (
			<Column style={{flex: 1, height: "100%"}}>
				{/*<iframe src="/proxy/pixie" style={{height: "100%"}}/>*/}
				TODO
			</Column>
		);
	}
}