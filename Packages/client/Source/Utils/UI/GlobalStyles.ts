import {AddGlobalStyle} from "web-vcore/nm/react-vextensions.js";
import {ES} from "web-vcore";

export const styles = {
	page: ES({
		width: 960, flex: 1, margin: "100px auto", padding: 50, background: "rgba(0,0,0,.75)", borderRadius: 10, cursor: "auto",
	}),
	vMenuItem: {padding: "3px 5px", borderTop: "1px solid rgba(255,255,255,.1)"},

	// fixes that height:100% doesn't work in safari, when in flex container
	fillParent_abs: {position: "absolute", left: 0, right: 0, top: 0, bottom: 0},

	xButton: {padding: "5px 10px"},
};
export const colors = {
	// navBarBoxShadow: "rgba(70,70,70,.5) 0px 0px 150px",
	// navBarBoxShadow: "rgba(100,100,100,1) 0px 0px 3px",
	navBarBoxShadow: "rgba(100, 100, 100, .3) 0px 0px 3px, rgba(70,70,70,.5) 0px 0px 150px",
};

AddGlobalStyle(`
.VMenu > div:first-child { border-top: initial !important; }
`);