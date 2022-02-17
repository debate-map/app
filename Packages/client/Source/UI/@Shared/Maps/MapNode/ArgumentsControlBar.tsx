import {Column, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, GetDOM} from "web-vcore/nm/react-vextensions.js";
import {AddArgumentButton} from "UI/@Shared/Maps/MapNode/NodeUI/AddArgumentButton.js";
import {MapNodeL3, Polarity, Map, ChildGroup, MapNodeType} from "dm_common";
import {useRef_nodeLeftColumn} from "tree-grapher";
import {useCallback} from "react";
import {Observer} from "web-vcore";
import {liveSkin} from "Utils/Styles/SkinManager";
import {GetNodeColor} from "Store/db_ext/nodes";

@Observer
export class ArgumentsControlBar extends BaseComponentPlus({} as {map: Map, node: MapNodeL3, path: string, treePath: string, inBelowGroup: boolean, group: ChildGroup, childBeingAdded: boolean}, {premiseTitle: ""}) {
	render() {
		const {map, node, path, treePath, inBelowGroup, group, childBeingAdded} = this.props;
		// const backgroundColor = GetNodeColor({ type: MapNodeType.category } as MapNodeL3);

		const {ref_leftColumn, ref_group} = useRef_nodeLeftColumn(treePath, {
			color: GetNodeColor({type: MapNodeType.claim}, "raw", false).css(),
			gutterWidth: inBelowGroup ? 20 : 30, parentGutterWidth: 30,
		}, true);

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
					paddingLeft: 30 + (inBelowGroup ? 20 : 0),
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
				{/* <Column>
					<Row>Supporting arguments</Row>
					<Row>Opposing arguments</Row>
				</Column> */}
				<Column ml={0}> {/* vertical */}
					<AddArgumentButton map={map} node={node} path={path} group={group} polarity={Polarity.supporting}/>
					<AddArgumentButton map={map} node={node} path={path} group={group} polarity={Polarity.opposing} style={{marginTop: 1}}/>
				</Column>
				{/* <Row ml={0}> // horizontal
					<AddArgumentButton map={map} node={node} path={parentPath} polarity={Polarity.supporting}/>
					<AddArgumentButton map={map} node={node} path={parentPath} polarity={Polarity.opposing} style={{marginLeft: 3}}/>
				</Row> */}
				{childBeingAdded &&
					<div style={{marginLeft: 15}}>
						Adding new entry...
					</div>}
			</Row>
		);
	}
}