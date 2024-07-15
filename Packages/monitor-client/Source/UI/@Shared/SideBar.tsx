import {observer} from "mobx-react";
import React from "react";
import {store} from "Store";
import {Observer, RunInAction, RunInAction_Set} from "web-vcore";
import {ModifyString} from "js-vextensions";
import {Button, Column, Row} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";

const PageButton = observer((p: {page: string, subpage?: string, text?: string, textShort?: string})=>{
	const uiState = store.main;
	const textFull = p.text ?? ModifyString(p.page, m=>[m.startLower_to_upper]);
	return <Button text={uiState.sideBarExpanded ? textFull : (p.textShort ?? textFull.slice(0, 2))} onClick={()=>{
		RunInAction("SideBar_PageButton_click", ()=>{
			store.main.page = p.page;
			if (p.subpage) store.main[p.page].subpage = p.subpage;
		});
	}}/>;
});

@Observer
export class SideBar extends BaseComponent<{}, {}> {
	render() {
		let {} = this.props;
		const uiState = store.main;

		return (
			<Column mr={uiState.sideBarExpanded ? 10 : 0} style={{width: uiState.sideBarExpanded ? 200 : 30}}>
				<Button text={uiState.sideBarExpanded ? "-" : "+"} style={{marginBottom: 10}} onClick={()=>store.main.sideBarExpanded = !store.main.sideBarExpanded}/>
				<PageButton page="home" textShort="Ho"/>
				<PageButton page="logs" text="Logs" textShort="Lo"/>
				<PageButton page="db" subpage="requests" text="DB/Requests" textShort="DR"/>
				<PageButton page="db" subpage="watchers" text="DB/Watchers" textShort="DW"/>
				<PageButton page="db" subpage="migrate" text="DB/Migrate" textShort="DM"/>
				<PageButton page="testing" text="Testing" textShort="Te"/>
				<PageButton page="netdata" text="NetData" textShort="ND"/>
				<PageButton page="grafana" text="Grafana" textShort="Gr"/>
				<PageButton page="prometheus" text="Prometheus" textShort = "Pr"/>
				<PageButton page="alert-manager" text="AlertManager" textShort="AM"/>
				<PageButton page="pyroscope" text="Pyroscope" textShort="Py"/>
				{/*<PageButton page="pixie" text="Pixie" textShort="Pi"/>*/}
			</Column>
		);
	}
}