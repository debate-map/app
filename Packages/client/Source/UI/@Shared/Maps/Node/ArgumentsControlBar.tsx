import {Column, Row} from "react-vcomponents";
import {AddArgumentButton} from "UI/@Shared/Maps/Node/NodeUI/AddArgumentButton.js";
import {NodeL3, Polarity, DMap, ChildGroup, NodeType} from "dm_common";
import {useRef_nodeLeftColumn} from "tree-grapher";
import {Ref, useCallback, useState} from "react";
import {GetNodeColor} from "Store/db_ext/nodes";
import {GUTTER_WIDTH_SMALL, GUTTER_WIDTH} from "./NodeLayoutConstants.js";
import {observer_mgl} from "mobx-graphlink";
import React from "react";

type Props = {
	map: DMap,
	node: NodeL3,
	path: string,
	treePath: string,
	inBelowGroup: boolean,
	group: ChildGroup,
	childBeingAdded: boolean
	ref: Ref<HTMLDivElement>,
}

export const ArgumentsControlBarFn = observer_mgl((props: Props)=>{
	const {map, node, path, treePath, inBelowGroup, group, childBeingAdded, ref} = props;
	const [premiseTitle, setPremiseTitle] = useState("");

	const {ref_leftColumn, ref_group} = useRef_nodeLeftColumn(treePath, {
		color: GetNodeColor({type: NodeType.claim}, "connector", false).css(),
		gutterWidth: inBelowGroup ? GUTTER_WIDTH_SMALL : GUTTER_WIDTH, parentGutterWidth: GUTTER_WIDTH,
	}, {}, true);

	const handleRef = useCallback((c: Row)=>{
		const dom = c.root ? c.root : null;
		ref_leftColumn(dom);
		if (dom) {
			dom["nodeGroup"] = ref_group.current;
			if (ref_group.current) dom.classList.add(`lcForNodeGroup_${ref_group.current.path}`);
		}

		if (!ref) return;
		if (typeof ref == "function") ref(dom);
		else ref.current = dom;
	}, [ref_leftColumn, ref_group, ref])

	return (
		<Row className="ArgumentsControlBar clickThrough"
			ref={handleRef}
			style={{
				position: "absolute",
				boxSizing: "content-box", // not needed since width is not hard-set, but using for consistency
				paddingLeft: GUTTER_WIDTH + (inBelowGroup ? GUTTER_WIDTH_SMALL : 0),
			}}
		>
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
});
