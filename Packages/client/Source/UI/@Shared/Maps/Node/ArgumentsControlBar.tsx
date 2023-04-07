import {Column, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, GetDOM} from "web-vcore/nm/react-vextensions.js";
import {AddArgumentButton} from "UI/@Shared/Maps/Node/NodeUI/AddArgumentButton.js";
import {NodeL3, Polarity, Map, ChildGroup, NodeType} from "dm_common";
import {useRef_nodeLeftColumn} from "tree-grapher";
import {useCallback} from "react";
import {Observer} from "web-vcore";
import {liveSkin} from "Utils/Styles/SkinManager";
import {GetNodeColor} from "Store/db_ext/nodes";
import {GUTTER_WIDTH_SMALL, GUTTER_WIDTH} from "./NodeUI.js";

@Observer
export class ArgumentsControlBar extends BaseComponentPlus({} as {map: Map, node: NodeL3, path: string, treePath: string, inBelowGroup: boolean, group: ChildGroup, childBeingAdded: boolean}, {premiseTitle: ""}) {
	render() {
		const {map, node, path, treePath, inBelowGroup, group, childBeingAdded} = this.props;
		// const backgroundColor = GetNodeColor({ type: NodeType.category } as NodeL3);

		const {ref_leftColumn, ref_group} = useRef_nodeLeftColumn(treePath, {
			color: GetNodeColor({type: NodeType.claim}, "raw", false).css(),
			gutterWidth: inBelowGroup ? GUTTER_WIDTH_SMALL : GUTTER_WIDTH, parentGutterWidth: GUTTER_WIDTH,
		}, {}, true);

		return (
			<Row className="ArgumentsControlBar clickThrough"
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
					//color: liveSkin.NodeTextColor().css(),
					boxSizing: "content-box", // not needed since width is not hard-set, but using for consistency
					paddingLeft: GUTTER_WIDTH + (inBelowGroup ? GUTTER_WIDTH_SMALL : 0),
				}}
			>
				{/* <Row style={{
					/*alignSelf: "flex-start",*#/ position: "relative", background: backgroundColor.css(), borderRadius: 5,
					boxShadow: "rgba(0,0,0,1) 0px 0px 2px", alignSelf: "stretch",
					padding: "0 5px",
					//paddingLeft: 5,
				}}>
					<Pre>Sort by: </Pre>
					<Select options={["Ratings", "Recent"]} style={{borderRadius: 5, outline: "none"}} value={"Ratings"} onChange={val=>{}}/>
				</Row> */}
				<Column ml={0}> {/* vertical */}
					<AddArgumentButton map={map} node={node} path={path} group={group} polarity={Polarity.supporting}/>
					<AddArgumentButton map={map} node={node} path={path} group={group} polarity={Polarity.opposing} style={{marginTop: 1}}/>
				</Column>
				{childBeingAdded &&
					<div style={{marginLeft: 15}}>
						Adding new entry...
					</div>}
			</Row>
		);
	}
}