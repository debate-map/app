import {Map} from "dm_common";
import * as React from "react";
import {useCallback} from "react";
import {VMenuItem, VMenuStub} from "react-vmenu";
import {store} from "Store";
import {GetNodeView} from "Store/main/maps/mapViews/$mapView.js";
import {useRef_nodeLeftColumn} from "tree-grapher";
import {liveSkin} from "Utils/Styles/SkinManager";
import {ES, Icon, Observer, RunInAction} from "web-vcore";
import {Button, Div, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, GetDOM} from "web-vcore/nm/react-vextensions.js";

@Observer
export class ChildLimitBar extends BaseComponent<{map: Map, path: string, treePath: string, inBelowGroup: boolean, childrenWidthOverride: number|n, direction: "up" | "down", childCount: number, childLimit: number}, {}> {
	static HEIGHT = 36;
	render() {
		const {map, path, treePath, inBelowGroup, childrenWidthOverride, direction, childCount, childLimit} = this.props;
		const nodeView = GetNodeView(map.id, path);
		const {initialChildLimit} = store.main.maps;
		const childrenVisible = childCount.KeepAtMost(childLimit);

		const {ref_leftColumn, ref_group} = useRef_nodeLeftColumn(treePath, {
			color: "transparent",
			gutterWidth: inBelowGroup ? 20 : 30, parentGutterWidth: 30,
		});

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
					paddingLeft: 30 + (inBelowGroup ? 20 : 0),
				}}
			>
				<Button text={
					<Row>
						<Icon icon={`arrow-${direction}`} size={15}/>
						<Div ml={3}>{childCount > childrenVisible ? childCount - childrenVisible : null}</Div>
					</Row>
				} title="Show more"
				enabled={childrenVisible < childCount} style={ES({flex: 1})} onClick={()=>{
					RunInAction("ChildLimitBar.showMore.onClick", ()=>{
						nodeView[`childLimit_${direction}`] = (childrenVisible + 3).KeepAtMost(childCount);
					});
				}}/>
				<Button ml={5} text={
					<>
						<Row>
							<Icon icon={`arrow-${direction == "up" ? "down" : "up"}`} size={15}/>
						</Row>
						<VMenuStub>
							<VMenuItem text="Collapse to minimum" style={liveSkin.Style_VMenuItem()}
								onClick={e=>{
									if (e.button !== 0) return;
									RunInAction("ChildLimitBar.showLess.collapseToMinumum", ()=>{
										nodeView[`childLimit_${direction}`] = initialChildLimit;
									});
								}}/>
						</VMenuStub>
					</>
				} title="Show less"
				enabled={childrenVisible > initialChildLimit} style={ES({flex: 1})} onClick={()=>{
					RunInAction("ChildLimitBar.showLess.onClick", ()=>{
						nodeView[`childLimit_${direction}`] = (childrenVisible - 3).KeepAtLeast(initialChildLimit);
					});
				}}/>
			</Row>
		);
	}
}