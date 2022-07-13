import {GetNode, GetNodeTagComps, GetNodeTags, MapNodeL3, TagComp_CloneHistory} from "dm_common";
import {Clone} from "js-vextensions";
import React from "react";
import {store} from "Store";
import {SearchResultRow} from "UI/@Shared/NavBar/SearchPanel.js";
import {ES, Observer} from "web-vcore";
import {MapWithBailHandling} from "web-vcore/.yalc/mobx-graphlink";
import {Button, Column, Row, Select} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {BoxController, ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview";

@Observer
export class CloneHistoryButton extends BaseComponent<{node: MapNodeL3}, {}> {
	render() {
		const {node} = this.props;
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
		//const mainCloneHistoryComp: TagComp_CloneHistory|null = cloneHistoryComps.Max(a=>a.cloneChain.length);
		const historiesWithEntriesBeforeUs = cloneHistoryComps_final.filter(a=>a.cloneChain.indexOf(node.id) > 0);
		const historiesWithEntriesAfterUs = cloneHistoryComps_final.filter(a=>a.cloneChain.indexOf(node.id) < a.cloneChain.length - 1);

		return (
			<div style={{position: "absolute", right: "calc(100% - 35px)", top: 0, bottom: 0, display: "flex"}}>
				<Button text={`${historiesWithEntriesBeforeUs.length}:${historiesWithEntriesAfterUs.length}`} style={{margin: "auto 0", padding: "1px 5px"}}
					title={`This node was the clone in ${historiesWithEntriesBeforeUs.length} case, and the source for a clone in ${historiesWithEntriesAfterUs.length} cases. (click for details)`}
					onClick={()=>{
						let ui: CloneHistoryUI|n;
						const controller = ShowMessageBox({
							title: `Viewing clone-history for node "${node.id}" (as source and/or clone)`,
							// don't use overlay/background-blocker
							overlayStyle: {background: "none", pointerEvents: "none"},
							containerStyle: {pointerEvents: "auto"},
							message: ()=><CloneHistoryUI ref={c=>ui = c} node={node} controller={controller}/>,
						});
					}}/>
			</div>
		);
	}
}

export function CSVCell(text: string) {
	let result = text;
	text = text.trim(); // remove extra spaces at start/end (dunno why, but some users seem to add them fairly frequently)
	if (result.includes(`"`)) result = result.replace(/"/g, `\\"`);
	if (result.includes(",")) result = `"${result}"`;
	return result;
}

@Observer
class CloneHistoryUI extends BaseComponentPlus(
	{} as {node: MapNodeL3, controller: BoxController},
	{
		tab: 0,
	},
	) {
	render() {
		const {node, controller} = this.props;
		const {tab} = this.state;
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
						value={tab} onChange={val=>this.SetState({tab: val})}/>
				</Row>
				{tab <= cloneHistoryComps.length &&
				<CloneHistoryCompUI node={node} comp={cloneHistoryComps[tab]}/>}
			</Column>
		);
	}
}

class CloneHistoryCompUI extends BaseComponent<{node: MapNodeL3, comp: TagComp_CloneHistory}, {}> {
	render() {
		const {node, comp} = this.props;
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
	}
}