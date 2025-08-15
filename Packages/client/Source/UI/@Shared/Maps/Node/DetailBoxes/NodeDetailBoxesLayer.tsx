import React from "react";
import {zIndexes} from "Utils/UI/ZIndexes";

export let nodeDetailBoxesLayer_container: HTMLDivElement;

export const NodeDetailBoxesLayer = ()=>{
	return (
		<div ref={c=>{
			nodeDetailBoxesLayer_container = c!;
		}}style={{
			position: "relative", zIndex: zIndexes.overNavBarDropdown,
		}}>
		</div>
	);
};
