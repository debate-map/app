import {Column, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, GetDOM} from "web-vcore/nm/react-vextensions.js";
import {AddArgumentButton} from "UI/@Shared/Maps/MapNode/NodeUI/AddArgumentButton.js";
import {MapNodeL3, Polarity, Map, ChildGroup} from "dm_common";
import {useRef_nodeChildHolder, useRef_nodeLeftColumn} from "tree-grapher";
import {useCallback} from "react";
import {Observer} from "web-vcore";

@Observer
export class ArgumentsControlBar extends BaseComponentPlus({} as {map: Map, node: MapNodeL3, path: string, treePath: string, group: ChildGroup, childBeingAdded: boolean}, {premiseTitle: ""}) {
	render() {
		const {map, node, path, treePath, group, childBeingAdded} = this.props;
		// const backgroundColor = GetNodeColor({ type: MapNodeType.category } as MapNodeL3);

		const {ref_leftColumn, ref_group: ref_leftColumn_group} = useRef_nodeLeftColumn(treePath, {color: "transparent"}, true);
		const {ref_childHolder, ref_group: ref_group_2} = useRef_nodeChildHolder(treePath);

		return (
			<Row className="argumentsControlBar clickThrough"
				ref={useCallback(c=>{
					ref_leftColumn.current = GetDOM(c) as any;
					ref_childHolder.current = GetDOM(c) as any; // yes, this element is both the left-column and child-holder (child-holder needed so collision-avoidance occurs)
					if (ref_leftColumn.current) ref_leftColumn.current["nodeGroup"] = ref_leftColumn_group.current;
				}, [ref_childHolder, ref_leftColumn, ref_leftColumn_group])}
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