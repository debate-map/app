import {AddGlobalStyle} from "./ReactGlobals";
export var styles = {
	page: {
		width: 960, margin: "100px auto", padding: "20px 50px", background: "rgba(0,0,0,.75)", borderRadius: 10,
	},
	vMenuItem: {padding: "3px 5px", borderTop: "1px solid rgba(255,255,255,.1)"},
};
export var colors = {
	//navBarBoxShadow: "rgba(70,70,70,.5) 0px 0px 150px",
	//navBarBoxShadow: "rgba(100,100,100,1) 0px 0px 3px",
	navBarBoxShadow: "rgba(100, 100, 100, .3) 0px 0px 3px, rgba(70,70,70,.5) 0px 0px 150px",
};

AddGlobalStyle(`
.VMenu > div:first-child { border-top: initial !important; }
`);