import React from "react";
import {P} from "web-vcore";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";

export class HomeUI extends BaseComponent<{}, {}> {
	render() {
		return (
			<article className="selectable">
				<P>TODO1</P>
			</article>
		);
	}
}