import {ChildLayout, GetChildLayout_Final, GetParentNode, Map, NodeL3, NodeType} from "dm_common";
import * as React from "react";
import {useCallback} from "react";
import {VMenuItem, VMenuStub} from "react-vmenu";
import {store} from "Store";
import {GetNodeView} from "Store/main/maps/mapViews/$mapView.js";
import {useRef_nodeLeftColumn} from "tree-grapher";
import {liveSkin} from "Utils/Styles/SkinManager";
import {ES, Icon, Observer, RunInAction} from "web-vcore";
import {Button, Div, Row} from "react-vcomponents";
import {BaseComponent, GetDOM} from "react-vextensions";
import {ChildLimitInfo} from "Store/main/maps.js";
import {GetNodeColor} from "Store/db_ext/nodes.js";
import {GUTTER_WIDTH, GUTTER_WIDTH_SMALL} from "../NodeLayoutConstants.js";

@Observer
export class ChildLimitBar extends BaseComponent<{map: Map, node: NodeL3, path: string, treePath: string, inBelowGroup: boolean, childrenWidthOverride: number|n, childLimitInfo: ChildLimitInfo}, {}> {
	static HEIGHT = 36;
	render() {
		const {map, node, path, treePath, inBelowGroup, childrenWidthOverride, childLimitInfo} = this.props;
		const {direction, showTarget_min, showTarget_max, showTarget_actual, childCount, childCountShowing} = childLimitInfo;
		const nodeView = GetNodeView(map.id, path)!;

		const {ref_leftColumn, ref_group} = useRef_nodeLeftColumn(treePath, {
			// if limit-bar is for showing/hiding premises, have the connector actually be visible (to clarify the limit-bar's role of involving the premises)
			color: inBelowGroup ? GetNodeColor({type: NodeType.claim}, "connector", false).css() : "transparent",
			gutterWidth: inBelowGroup ? GUTTER_WIDTH_SMALL : GUTTER_WIDTH, parentGutterWidth: GUTTER_WIDTH,
			parentIsAbove: inBelowGroup,
		});

		// in sl-layout, many of the "premises" are not really premises, but rather broken-down components of the "argument"; so use more generic term
		//const premisesOrComponentsStr = nodeLayout == ChildLayout.slStandard ? "components" : "premises";

		return (
			<Row
				ref={useCallback(c=>{
					const dom = GetDOM(c);
					ref_leftColumn(dom);
					if (dom) {
						dom["nodeGroup"] = ref_group.current;
						if (ref_group.current) dom.classList.add(`lcForNodeGroup_${ref_group.current.path}`);
					}
				}, [ref_leftColumn, ref_group])}
				style={{
					position: "absolute",
					// position: "absolute", marginTop: -30,
					//[direction == "up" ? "marginBottom" : "marginTop"]: 10,
					//margin: "5px 0",
					width: childrenWidthOverride, cursor: "default",
					boxSizing: "content-box",
					paddingLeft: GUTTER_WIDTH + (inBelowGroup ? GUTTER_WIDTH_SMALL : 0),
				}}
			>
				<Button title="Show more" enabled={childLimitInfo.HaveShowMoreButtonEnabled()} style={ES({flex: 1})}
					text={
						<Row>
							<Icon icon={`arrow-${direction}`} size={15}/>
							<Div ml={3}>{[
								childCount > showTarget_actual ? childCount.Distance(showTarget_actual) : null,
								//` [${showTarget_actual} -> ${childLimitInfo.ShowMore_NewLimit()}]`, // for debugging
								//node?.type == NodeType.argument && inBelowGroup ? ` (${premisesOrComponentsStr})` : "",
							].filter(a=>a != null).join("")}</Div>
						</Row>
					}
					onClick={()=>{
						RunInAction("ChildLimitBar.showMore.onClick", ()=>{
							nodeView[`childLimit_${direction}`] = childLimitInfo.ShowMore_NewLimit();
						});
					}}/>
				<Button ml={5} title="Show less" enabled={childLimitInfo.HaveShowLessButtonEnabled()} style={ES({flex: 1})}
					text={
						<>
							<Row>
								<Icon icon={`arrow-${direction == "up" ? "down" : "up"}`} size={15}/>
								{/*<Div ml={3}>{[
									showTarget_actual > showTarget_min ? showTarget_actual.Distance(showTarget_min) : null,
									//` [${showTarget_actual} -> ${childLimitInfo.ShowLess_NewLimit()}]`, // for debugging
									//node?.type == NodeType.argument && inBelowGroup ? ` (${premisesOrComponentsStr})` : "",
								].filter(a=>a != null).join("")}</Div>*/}
							</Row>
							<VMenuStub>
								<VMenuItem text="Collapse to minimum" style={liveSkin.Style_VMenuItem()}
									onClick={e=>{
										if (e.button !== 0) return;
										RunInAction("ChildLimitBar.showLess.collapseToMinumum", ()=>{
											nodeView[`childLimit_${direction}`] = showTarget_min;
										});
									}}/>
							</VMenuStub>
						</>
					}
					onClick={()=>{
						RunInAction("ChildLimitBar.showLess.onClick", ()=>{
							nodeView[`childLimit_${direction}`] = childLimitInfo.ShowLess_NewLimit();
						});
					}}/>
			</Row>
		);
	}
}