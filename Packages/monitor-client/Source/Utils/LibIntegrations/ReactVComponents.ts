import * as chroma_js from "web-vcore/nm/chroma-js.js";
import * as react_color from "react-color";
import {ColorPickerBox} from "web-vcore/nm/react-vcomponents.js";

export function InitReactVComponents() {
	ColorPickerBox.Init(react_color, chroma_js);
}