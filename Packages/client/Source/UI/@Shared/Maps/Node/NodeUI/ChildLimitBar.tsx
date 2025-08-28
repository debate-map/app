import {DMap, NodeL3, NodeType} from "dm_common";
import * as React from "react";
import {useCallback} from "react";
import {VMenuItem, VMenuStub} from "react-vmenu";
import {GetNodeView} from "Store/main/maps/mapViews/$mapView.js";
import {useRef_nodeLeftColumn} from "tree-grapher";
import {liveSkin} from "Utils/Styles/SkinManager";
import {ES, Icon, RunInAction} from "web-vcore";
import {Button, Div, Row} from "react-vcomponents";
import {ChildLimitInfo} from "Store/main/maps.js";
import {GetNodeColor} from "Store/db_ext/nodes.js";
import {GUTTER_WIDTH, GUTTER_WIDTH_SMALL} from "../NodeLayoutConstants.js";
import {observer_mgl} from "mobx-graphlink";
import {Ref} from "react";

type ChildLimitBar_Props = {
	map: DMap,
	node: NodeL3,
	path: string,
	treePath: string,
	inBelowGroup: boolean,
	childrenWidthOverride: number|n,
	childLimitInfo: ChildLimitInfo
	ref?: Ref<HTMLDivElement>,
};

export const ChildLimitBar = observer_mgl((props: ChildLimitBar_Props)=>{
	const {map, path, treePath, inBelowGroup, childrenWidthOverride, childLimitInfo, ref} = props;
	const {direction, showTarget_min, showTarget_actual, childCount} = childLimitInfo;
	const nodeView = GetNodeView(map.id, path)!;

	const {ref_leftColumn, ref_group} = useRef_nodeLeftColumn(treePath, {
		// if limit-bar is for showing/hiding premises, have the connector actually be visible (to clarify the limit-bar's role of involving the premises)
		color: inBelowGroup ? GetNodeColor({type: NodeType.claim}, "connector", false).css() : "transparent",
		gutterWidth: inBelowGroup ? GUTTER_WIDTH_SMALL : GUTTER_WIDTH, parentGutterWidth: GUTTER_WIDTH,
		parentIsAbove: inBelowGroup,
	});

	const handleRef = useCallback((c: Row)=>{
		const dom = c.root || null;
		ref_leftColumn(dom);
		if (dom) {
			dom["nodeGroup"] = ref_group.current;
			if (ref_group.current) dom.classList.add(`lcForNodeGroup_${ref_group.current.path}`);
		}

		if (!ref) return;
		if (typeof ref === "function") ref(dom);
		else ref.current = dom;

	}, [ref_leftColumn, ref_group, ref]);

	return (
		<Row
			ref={handleRef}
			style={{
				position: "absolute",
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
});
