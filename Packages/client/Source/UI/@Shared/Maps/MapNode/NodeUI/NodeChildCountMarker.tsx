import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {LimitBarPos} from "UI/@Shared/Maps/MapNode/NodeUI.js";
import {E} from "web-vcore/nm/js-vextensions.js";

export class NodeChildCountMarker extends BaseComponentPlus({textOutline: "rgba(10,10,10,1)"} as {childCount: number, textOutline?: string}, {}) {
	render() {
		const {childCount, textOutline} = this.props;
		if (childCount == 0) return <div/>;

		return (
			// this zero-width wrapper keeps the component from bumping the node-child-holder-boxes to the right
			<div style={{position: "absolute", left: "100%", top: 0, bottom: 0, display: "flex"}}>
				<div style={E(
					{
						margin: "auto 0 auto 9px", fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,.8)",
						// filter: "drop-shadow(0px 0px 5px rgba(0,0,0,1))"
						textShadow: `-1px 0 ${textOutline}, 0 1px ${textOutline}, 1px 0 ${textOutline}, 0 -1px ${textOutline}`,
					},
					//showBelowMessage && {paddingBottom: 13},
				)}>
					{childCount}
				</div>
			</div>
		);
	}
}