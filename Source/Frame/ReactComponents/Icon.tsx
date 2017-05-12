import {BaseComponent, BaseProps, AddGlobalStyle, basePropFullKeys, ApplyBasicStyles} from "../UI/ReactGlobals";
import Radium from "radium";
import {E} from "../General/Globals_Free";
import {ToJSON} from "../General/Globals";
import {createMarkupForStyles} from "react-dom/lib/CSSPropertyOperations";
import {Log} from "../General/Logging";

//import iconData from "../../../Source/Frame/UI/IconData.json";
/*var iconData_raw = {} as any; //require("../../../Source/Frame/UI/IconData.json");
let iconData = {};
for (let entry of iconData_raw.icons) {
	iconData[entry.tags[0]] = entry.paths[0];
}*/

/*
[old]
IconData.json generated using icomoon.io. Just add the packs below, select the icons listed in IconType (or just select all), then click "Download JSON" in corner menu.

Icon packs:
* IcoMoon - Free
* Font Awesome
*/

/*export type IconType =
| "arrow-up" | "arrow-down"
;*/

//export default class Icon extends BaseComponent<{icon: IconType, color?: string}, {}> {
export default class Icon extends BaseComponent<{icon: string, size: number, color?: string}, {}> {
	static defaultProps = {color: "rgba(255,255,255,.7)"};
	render() {
		let {icon, size, color} = this.props;
		//let data = iconData[icon];
	   /*return (
			<svg>
				<path d={data} fill={color}></path>
			</svg>
		);*/
		let info = require(`../../../Resources/SVGs/${icon}.svg`).default;
		return (
			<svg viewBox={info.viewBox} width={size} height={size}>
				<use xlinkHref={`#${info.id}`} style={{fill: color}}/>
			</svg>
		);
	}
}