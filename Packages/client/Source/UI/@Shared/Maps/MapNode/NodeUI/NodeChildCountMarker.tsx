import {BaseComponentPlus} from "web-vcore/nm/react-vextensions";
import {LimitBarPos} from "UI/@Shared/Maps/MapNode/NodeUI";
import {E} from "web-vcore/nm/js-vextensions";
import {ChildLimitBar} from "./NodeChildHolder";

export class NodeChildCountMarker extends BaseComponentPlus({textOutline: "rgba(10,10,10,1)"} as {childCount: number, textOutline?: string, limitBarPos?: LimitBarPos}, {}) {
	render() {
		const {childCount, textOutline, limitBarPos} = this.props;
		if (childCount == 0) return <div/>;

		return (
			<div style={E(
				{
					margin: "auto 0 auto 9px", fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,.8)",
					// filter: "drop-shadow(0px 0px 5px rgba(0,0,0,1))"
					textShadow: `-1px 0 ${textOutline}, 0 1px ${textOutline}, 1px 0 ${textOutline}, 0 -1px ${textOutline}`,
				},
				/* showLimitBar && {[limitBar_above ? "paddingTop" : "paddingBottom"]: ChildLimitBar.HEIGHT},
				showBelowMessage && {paddingBottom: 13}, */
				limitBarPos == LimitBarPos.above && {paddingTop: ChildLimitBar.HEIGHT},
				{paddingBottom: 0 + /* (showBelowMessage ? 13 : 0) +*/ (limitBarPos == LimitBarPos.below ? ChildLimitBar.HEIGHT : 0)},
			)}>
				{childCount}
			</div>
		);
	}
}