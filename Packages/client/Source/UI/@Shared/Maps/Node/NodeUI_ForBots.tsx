import {AsNodeL3, GetNodeChildrenL2, GetNodeDisplayText, GetNodeParentsL2, GetRatingTypesForNode, DMap, NodeL2} from "dm_common";
import {GetOpenMapID} from "Store/main";
import {GetMapView} from "Store/main/maps/mapViews/$mapView.js";
import {Link} from "web-vcore";
import {Pre, Row} from "react-vcomponents";
import {GetInnerComp} from "react-vextensions";
import {ScrollView} from "react-vscrollview";
import {DefinitionsPanel} from "./DetailBoxes/Panels/DefinitionsPanel.js";
import {DetailsPanel} from "./DetailBoxes/Panels/DetailsPanel.js";
import {OthersPanel} from "./DetailBoxes/Panels/OthersPanel.js";
import {RatingsPanel} from "./DetailBoxes/Panels/RatingsPanel.js";
import {TagsPanel} from "./DetailBoxes/Panels/TagsPanel.js";
import {NodeBox} from "./NodeBox.js";
import React, {useRef} from "react";

export type NodeUI_ForBotsProps = {
	map: DMap,
	node: NodeL2,
};

export const NodeUI_ForBots = ({map, node}: NodeUI_ForBotsProps)=>{
	const innerUIRef = useRef<NodeBox|null>(null);

	const mapView = GetMapView(GetOpenMapID()!);
	const nodeParents = GetNodeParentsL2(node.id) as NodeL2[];
	const nodeChildren = GetNodeChildrenL2(node.id) as NodeL2[];

	if (mapView == null || nodeParents.Any(a=>a == null) || nodeChildren.Any(a=>a == null)) return <div/>;

	//just list one of the parents as the "current parent", so code relying on a parent doesn't error
	const path = `${nodeParents.length ? `${nodeParents[0].id}/` : ""}${node.id}`;
	const nodeL3 = AsNodeL3(node, null);

	return (
        <ScrollView scrollVBarStyle={{width: 10}}>
            <Row>
                <Pre>Parents: </Pre>
                {nodeParents.map((parent, index)=>(
                    <span key={index}>
                        {index > 0 ? ", " : ""}
                        <Link actionFunc={s=>(mapView.bot_currentNodeID = parent!.id)}>
                            {GetNodeDisplayText(parent!, null, map)} ({parent!.id})
                        </Link>
                    </span>
                ))}
            </Row>
            <Row>
                <Pre>Children: </Pre>
                {nodeChildren.map((child, index)=>(
                    <span key={index}>
                        {index > 0 ? ", " : ""}
                        <Link actionFunc={s=>(mapView.bot_currentNodeID = child.id)}>
                            {GetNodeDisplayText(child!, null, map)} ({child!.id})
                        </Link>
                    </span>
                ))}
            </Row>

            <article>
				Main box:
                <NodeBox
                    ref={c=>(innerUIRef.current = GetInnerComp(c))}
                    indexInNodeList={0}
                    map={map}
                    node={nodeL3}
                    path={path}
                    treePath="0"
                    forLayoutHelper={false}
                    width={null as any}
                    standardWidthInGroup={null as any}
                />

				Panels:
                {GetRatingTypesForNode(nodeL3).map((ratingInfo, index)=>(
                    <RatingsPanel key={index} node={nodeL3} path={path} ratingType={ratingInfo.type} />
                ))}

                <DefinitionsPanel show={true} map={map} node={node} path={path} />
                <TagsPanel show={true} map={map} node={nodeL3} path={path} />
                <DetailsPanel show={true} map={map} node={nodeL3} path={path} />
                <OthersPanel show={true} map={map} node={nodeL3} path={path} />
            </article>
        </ScrollView>
	);
};
