import {Assert, E} from "web-vcore/nm/js-vextensions.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {rootPageDefaultChilds} from "Utils/URL/URLs.js";
import {store, RootState} from "Store";
import {ActionFunc, Link, Observer} from "web-vcore";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {colors} from "../../Utils/UI/GlobalStyles.js";
import {GADHeaderFont} from "./GAD.js";

// @Observer
export class SubNavBar_GAD extends BaseComponent<{fullWidth?: boolean}, {}> {
	render() {
		const {fullWidth, children} = this.props;
		return (
			<nav className="clickThrough" style={{
				position: "absolute", zIndex: zIndexes.navBar, top: 0, width: "100%", textAlign: "center",
				// background: "#000 url('/Images/Tiling/TopMenu.png') repeat-x scroll",
				// background: "rgba(0,0,0,.5)", boxShadow: "3px 3px 7px rgba(0,0,0,.07)",
			}}>
				<div style={E(
					{display: "inline-block", background: "#fff", boxShadow: colors.navBarBoxShadow, padding: "0 30px"},
				)}>
					{children}
				</div>
			</nav>
		);
	}
}

@Observer
export class SubNavBarButton_GAD extends BaseComponent<{page: string, subpage: string, text: string, actionFuncIfAlreadyActive?: ActionFunc<any>}, {}> {
	render() {
		const {page, subpage, text, actionFuncIfAlreadyActive} = this.props;
		const currentSubpage = store.main[page].subpage || rootPageDefaultChilds[page];
		const active = subpage == currentSubpage;

		let actionFunc: ActionFunc<RootState>;
		if (!active) {
			actionFunc = s=>s.main[page].subpage = subpage;
		} else if (actionFuncIfAlreadyActive) {
			actionFunc = actionFuncIfAlreadyActive;
		} else {
			Assert(false);
		}

		const style = {
			display: "inline-block", cursor: "pointer", verticalAlign: "middle",
			lineHeight: "30px", color: "#000", padding: "0 15px", textDecoration: "none", opacity: 0.9,
			fontFamily: GADHeaderFont,
			fontSize: 16, textTransform: "uppercase", fontWeight: "normal",
		};

		if (subpage == "about") {
			//return <Link to="https://www.greatamericandebate.org/the-mission" text="About" style={E(style)}/>;
			return <Link to="https://www.covidconvo.org" text="About" style={E(style)}/>;
		}

		return (
			<Link actionFunc={actionFunc} text={text} style={E(style)}/>
		);
	}
}