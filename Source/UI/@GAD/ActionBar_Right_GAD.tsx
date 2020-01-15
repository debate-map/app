import {BaseComponentWithConnector, BaseComponentPlus} from "react-vextensions";
import {Row} from "react-vcomponents";
import {colors} from "Utils/UI/GlobalStyles";
import {LayoutDropDown} from "UI/@Shared/Maps/MapUI/ActionBar_Right/LayoutDropDown";
import {Map} from "Store/firebase/maps/@Map";
import {HSLA} from "vwebapp-framework";
import {E} from "js-vextensions";
import {zIndexes} from "Utils/UI/ZIndexes";

export class ActionBar_Right_GAD extends BaseComponentPlus({} as {map: Map, subNavBarWidth: number}, {}) {
	render() {
		const {map, subNavBarWidth} = this.props;
		const tabBarWidth = 104;
		return (
			<nav style={{
				position: "absolute", zIndex: zIndexes.actionBar, left: `calc(50% + ${subNavBarWidth / 2}px)`, right: 0, top: 0, textAlign: "center",
				// background: "rgba(0,0,0,.5)", boxShadow: "3px 3px 7px rgba(0,0,0,.07)",
			}}>
				<Row center style={E(
					{
						justifyContent: "flex-end", background: "rgba(0,0,0,.7)", boxShadow: colors.navBarBoxShadow,
						width: "100%", height: 40, borderRadius: "0 0 0 10px",
					},
					{
						background: HSLA(0, 0, 1, 1),
						boxShadow: "rgba(100, 100, 100, .3) 0px 0px 3px, rgba(70,70,70,.5) 0px 0px 150px",
						// boxShadow: null,
						// filter: 'drop-shadow(rgba(0,0,0,.5) 0px 0px 10px)',
					},
				)}>
					<LayoutDropDown map={map}/>
				</Row>
			</nav>
		);
	}
}