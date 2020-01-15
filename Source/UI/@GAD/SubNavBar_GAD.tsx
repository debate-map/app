import {E} from "js-vextensions";
import {BaseComponent} from "react-vextensions";
import {rootPageDefaultChilds} from "Utils/URL/URLs";
import {store, RootState} from "Store";
import {ActionFunc, Link, Observer} from "vwebapp-framework";
import {zIndexes} from "Utils/UI/ZIndexes";
import {colors} from "../../Utils/UI/GlobalStyles";

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
		}

		const style = {
			display: "inline-block", cursor: "pointer", verticalAlign: "middle",
			lineHeight: "30px", color: "#000", padding: "0 15px", textDecoration: "none", opacity: 0.9,
			// fontFamily: 'Bebas Neue', // computer should have this font
			fontFamily: "Cinzel",
			fontSize: 16, textTransform: "uppercase", fontWeight: "normal",
		};

		if (subpage == "about") {
			return <Link to="https://www.greatamericandebate.org/the-mission" text="About" style={E(style)}/>;
		}

		return (
			<Link actionFunc={actionFunc} text={text} style={E(style)}/>
		);
	}
}