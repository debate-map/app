import React, {useEffect} from "react";
import {StreamUI} from "UI/Social/StreamUI";
import {BaseComponent, SimpleShouldUpdate} from "web-vcore/nm/react-vextensions.js";
import {liveSkin} from "Utils/Styles/SkinManager";
import {Column, Row} from "web-vcore/nm/react-vcomponents";
import {Timer} from "web-vcore/.yalc/js-vextensions";
import {Observer} from "web-vcore";
import {store} from "Store";

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
			</Column>
		);
	}
}