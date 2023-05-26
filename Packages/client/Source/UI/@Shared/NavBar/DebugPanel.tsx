import React, {useEffect} from "react";
import {StreamUI} from "UI/Social/StreamUI";
import {BaseComponent, SimpleShouldUpdate} from "web-vcore/nm/react-vextensions.js";
import {liveSkin} from "Utils/Styles/SkinManager";
import {CheckBox, Column, Row} from "web-vcore/nm/react-vcomponents";
import {Timer} from "web-vcore/nm/js-vextensions.js";
import {InfoButton, Observer, RunInAction_Set} from "web-vcore";
import {store} from "Store";
import {GetMGLUnsubscribeDelay, graph} from "Utils/LibIntegrations/MobXGraphlink";

@Observer
export class DebugPanel extends BaseComponent<{}, {}> {
	render() {
		useEffect(()=>{
			const timer = new Timer(200, ()=>{
				this.Update();
			}).Start();
			return ()=>timer.Stop();
		});

		const stats = store.graphlink.GetStats();

		return (
			<Column style={{
				width: 800, padding: 5, borderRadius: "0 0 5px 0",
				background: liveSkin.NavBarPanelBackgroundColor().css(), border: liveSkin.OverlayBorder(),
			}}>
				<Row>MobX Graphlink stats</Row>
				<Row>Attached tree-nodes: {stats.attachedTreeNodes}</Row>
				<Row>With requested-subs: {stats.nodesWithRequestedSubscriptions}</Row>
				<Row>With requested-subs, waiting: {stats.nodesWithRequestedSubscriptions - stats.nodesWithFulfilledSubscriptions}</Row>
				<Row>With requested-subs, fulfilled: {stats.nodesWithFulfilledSubscriptions}</Row>
				<Row>
					<CheckBox text="Block MobX unsubscribing (on data becoming unobserved)" value={store.main.blockMobXUnsubscribing} onChange={val=>{
						RunInAction_Set(this, ()=>store.main.blockMobXUnsubscribing = val);
						graph.unsubscribeTreeNodesAfter = GetMGLUnsubscribeDelay();
					}}/>
					<InfoButton ml={5} text="Requires page-reload to (fully) take effect."/>
				</Row>
				<Row>
					<CheckBox text="Block cache-clearing (on user-data change/resend)" value={store.main.blockCacheClearing} onChange={val=>RunInAction_Set(this, ()=>store.main.blockCacheClearing = val)}/>
				</Row>
			</Column>
		);
	}
}