import React from "react";
import {zIndexes} from "Utils/UI/ZIndexes";
import {Row} from "web-vcore/nm/react-vcomponents";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions";
import {GetMapUICSSFilter} from "../../MapUI";

export let nodeDetailBoxesLayer_container: HTMLDivElement;

export class NodeDetailBoxesLayer extends BaseComponentPlus({}, {}) {
	render() {
		let {} = this.props;
		return (
			<div ref={c=>nodeDetailBoxesLayer_container = c!} style={{
				position: "relative", zIndex: zIndexes.nodeDetailBoxes,
				//filter: GetMapUICSSFilter(),
			}}>
			</div>
		);
	}
}