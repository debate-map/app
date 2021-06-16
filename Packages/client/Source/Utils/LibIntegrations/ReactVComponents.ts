import * as chroma_js from "chroma-js";
import * as react_color from "react-color";
import {ColorPickerBox} from "web-vcore/nm/react-vcomponents";

export function InitReactVComponents() {
	ColorPickerBox.Init(react_color, chroma_js);
}