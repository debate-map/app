import {AddGlobalStyle} from "react-vextensions";

export var styles = {
	page: ES({
		width: 960, flex: 1, margin: "100px auto", padding: 50, background: "rgba(0,0,0,.75)", borderRadius: 10, cursor: "auto",
	}),
	vMenuItem: {padding: "3px 5px", borderTop: "1px solid rgba(255,255,255,.1)"},

	// fixes that height:100% doesn't work in safari, when in flex container
	fillParent_abs: {position: "absolute", left: 0, right: 0, top: 0, bottom: 0},
};
export var colors = {
	//navBarBoxShadow: "rgba(70,70,70,.5) 0px 0px 150px",
	//navBarBoxShadow: "rgba(100,100,100,1) 0px 0px 3px",
	navBarBoxShadow: "rgba(100, 100, 100, .3) 0px 0px 3px, rgba(70,70,70,.5) 0px 0px 150px",
};

AddGlobalStyle(`
.VMenu > div:first-child { border-top: initial !important; }
`);

/*declare global {	function ES<E1,E2,E3,E4,E5,E6,E7,E8>(e1?:E1,e2?:E2,e3?:E3,e4?:E4,e5?:E5,e6?:E6,e7?:E7,e8?:E8):E1&E2&E3&E4&E5&E6&E7&E8; } G({ES});
function ES<E1,E2,E3,E4,E5,E6,E7,E8>(e1?:E1,e2?:E2,e3?:E3,e4?:E4,e5?:E5,e6?:E6,e7?:E7,e8?:E8):E1&E2&E3&E4&E5&E6&E7&E8 {*/
declare global { function ES(...styles): any; } G({ES});
// same as E(...), except applies extra things for style-objects
function ES(...styles) {
	let result = E(...styles);

	// for firefox; prevents {flex: 1} from setting {minWidth: "auto"}
	if (result.flex) {
		if (result.minWidth == null) result.minWidth = 0;
		if (result.minHeight == null) result.minHeight = 0;
	}

	return result;
}