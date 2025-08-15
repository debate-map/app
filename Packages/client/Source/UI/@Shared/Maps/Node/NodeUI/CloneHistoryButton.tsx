import {GetNode, GetNodeTagComps, GetNodeTags, NodeL3, TagComp_CloneHistory} from "dm_common";
import {Clone} from "js-vextensions";
import React, {useState} from "react";
import {store} from "Store";
import {SearchResultRow} from "UI/@Shared/NavBar/SearchPanel.js";
import {ES} from "web-vcore";
import {MapWithBailHandling} from "mobx-graphlink";
import {Button, Column, Row, Select} from "react-vcomponents";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
import {ScrollView} from "react-vscrollview";
import {observer_mgl} from "mobx-graphlink";

export const CloneHistoryButton = observer_mgl(({node}: {node: NodeL3})=>{
	if (!store.main.maps.showCloneHistoryButtons) return null;
	const cloneHistoryComps_raw = GetNodeTagComps(node.id).filter(a=>a instanceof TagComp_CloneHistory) as TagComp_CloneHistory[];

	// "clean" our copy of the clone-histories, to ignore entries pointing to a node that doesn't exist
	// (else, someone could see the clone-history button as signifying there's a clone, eg. so deletion is safe, when in fact that clone was already deleted)
	// (in the future, this will be solved by a thorough cleanup of tags at the point of node-deletion)
	const cloneHistoryComps_cleaned = cloneHistoryComps_raw.map(comp=>{
		const cleaned = Clone(comp) as TagComp_CloneHistory;
		cleaned.cloneChain = MapWithBailHandling(cleaned.cloneChain, id=>GetNode(id)?.id).filter(a=>a != null) as string[];
		return cleaned;
	});

	const cloneHistoryComps_final = cloneHistoryComps_cleaned.filter(a=>a.cloneChain.length > 1);
	if (cloneHistoryComps_final.length == 0) return null;

	const historiesWithEntriesBeforeUs = cloneHistoryComps_final.filter(a=>a.cloneChain.indexOf(node.id) > 0);
	const historiesWithEntriesAfterUs = cloneHistoryComps_final.filter(a=>a.cloneChain.indexOf(node.id) < a.cloneChain.length - 1);

	return (
		<div style={{position: "absolute", right: "calc(100% - 35px)", top: 0, bottom: 0, display: "flex"}}>
			<Button text={`${historiesWithEntriesBeforeUs.length}:${historiesWithEntriesAfterUs.length}`} style={{margin: "auto 0", padding: "1px 5px"}}
				title={`This node was the clone in ${historiesWithEntriesBeforeUs.length} case, and the source for a clone in ${historiesWithEntriesAfterUs.length} cases. (click for details)`}
				onClick={()=>{
					const controller = ShowMessageBox({
						title: `Viewing clone-history for node "${node.id}" (as source and/or clone)`,
						// don't use overlay/background-blocker
						overlayStyle: {background: "none", pointerEvents: "none"},
						containerStyle: {pointerEvents: "auto"},
						message: ()=><CloneHistoryUI node={node} controller={controller}/>,
					});
				}}/>
		</div>
	);
});

export const CSVCell= (text: string)=>{
	let result = text;
	text = text.trim(); // remove extra spaces at start/end (dunno why, but some users seem to add them fairly frequently)
	if (result.includes(`"`)) result = result.replace(/"/g, `\\"`);
	if (result.includes(",")) result = `"${result}"`;
	return result;
};

type CloneHistoryUI_Props = {
	node: NodeL3,
	controller: BoxController,
}

const CloneHistoryUI = observer_mgl((props: CloneHistoryUI_Props)=>{
	const {node} = props;

	const [tab, setTab] = useState<number>(0);
	const cloneHistoryComps = GetNodeTags(node.id)
		.OrderBy(a=>a.createdAt)
		.filter(a=>a.cloneHistory != null)
		.map(a=>a.cloneHistory) as TagComp_CloneHistory[];

	return (
		<Column style={{width: 800, height: 600}}>
			<Row>
				<Select displayType="button bar" options={cloneHistoryComps.map((comp, i)=>{
					return {name: `#${i + 1} (as ${comp.cloneChain[0] == node.id ? "source" : "clone"})`, value: i};
				})}
					value={tab} onChange={val=>setTab(val)}/>
			</Row>
			{tab <= cloneHistoryComps.length &&
			<CloneHistoryCompUI node={node} comp={cloneHistoryComps[tab]}/>}
		</Column>
	);
});

type CloneHistoryCompUI_Props = {
	node: NodeL3,
	comp: TagComp_CloneHistory
};

const CloneHistoryCompUI = (props: CloneHistoryCompUI_Props)=>{
	const {comp} = props;

	return (
		<ScrollView style={ES({flex: 1})} contentStyle={{paddingTop: 10}} onContextMenu={e=>{
			if (e.nativeEvent["handled"]) return true;
			e.preventDefault();
		}}>
			{comp.cloneChain.map((entryID, i)=>{
				return <SearchResultRow key={i} nodeID={entryID} index={i}/>;
			})}
		</ScrollView>
	);
};
