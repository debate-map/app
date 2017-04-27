import {BaseComponent, BaseProps} from "../../Frame/UI/ReactGlobals";
import {colors} from "../../Frame/UI/GlobalStyles";
import {E} from "../../Frame/General/Globals_Free";
import Radium from "radium";
import Link from "../../Frame/ReactComponents/Link";
import {URL} from "../../Frame/General/URLs";

export default class SubNavBar extends BaseComponent<{fullWidth?: boolean}, {}> {
	render() {
		let {fullWidth, children} = this.props;
		return (
			<nav className="clickThrough" style={{
				position: "absolute", zIndex: 11, top: 0, width: "100%", textAlign: "center",
				//background: "#000 url('/Images/Tiling/TopMenu.png') repeat-x scroll",
				//background: "rgba(0,0,0,.5)", boxShadow: "3px 3px 7px rgba(0,0,0,.07)",
			}}>
				<div style={E(
					{display: "inline-block", background: "rgba(0,0,0,.7)", boxShadow: colors.navBarBoxShadow},
					fullWidth ? {width: "100%"} : {borderRadius: "0 0 10px 10px"},
				)}>
					{children}
				</div>
			</nav>
		);
	}
}

//export class SubNavBarButton extends BaseComponent<{to: string, toImplied?: string, page: string, text: string}, {}> {
export class SubNavBarButton extends BaseComponent<{to: string, toImplied?: string, text: string}, {}> {
	render() {
		/*var {to, toImplied, page, text} = this.props;
		let active = to.substr(1) == page || (toImplied && toImplied.substr(1) == page);*/
		var {to, toImplied, text} = this.props;
		let path = "/" + URL.Current().WithImpliedPathNodes().pathNodes.Take(2).join("/");
		let active = to == path || (toImplied && toImplied == path);
		return (
			<Link to={to} style={E(
				{
					display: "inline-block", cursor: "pointer", verticalAlign: "middle",
					lineHeight: "30px", color: "#FFF", padding: "0 15px", fontSize: 12, textDecoration: "none", opacity: .9,
					":hover": {color: "rgba(100,255,100,1)"},
				},
				active && {color: "rgba(100,255,100,1)"},
			)}>
				{text}
			</Link>
		);
	}
}