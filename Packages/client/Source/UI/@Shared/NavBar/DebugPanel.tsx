import React, {useEffect, useReducer} from "react";
import {liveSkin} from "Utils/Styles/SkinManager";
import {CheckBox, Column, Row} from "react-vcomponents";
import {Timer} from "js-vextensions";
import {InfoButton, RunInAction_Set} from "web-vcore";
import {store} from "Store";
import {GetMGLUnsubscribeDelay, graph} from "Utils/LibIntegrations/MobXGraphlink";
import {observer_mgl} from "mobx-graphlink";

export const DebugPanelFn = observer_mgl(()=>{
	const [, rerender] = useReducer((c: number)=>c + 1, 0);

	useEffect(()=>{
		const timer = new Timer(200, ()=>{
			rerender();
		}).Start();
		return ()=>timer.Stop();
	}, []);

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
					RunInAction_Set(()=>store.main.blockMobXUnsubscribing = val);
					graph.options.unsubscribeTreeNodesAfter = GetMGLUnsubscribeDelay();
				}}/>
				<InfoButton ml={5} text="Requires page-reload to (fully) take effect."/>
			</Row>
			<Row>
				<CheckBox text="Block cache-clearing (on user-data change/resend)" value={store.main.blockCacheClearing} onChange={val=>RunInAction_Set(()=>store.main.blockCacheClearing = val)}/>
			</Row>
		</Column>
	);
});
