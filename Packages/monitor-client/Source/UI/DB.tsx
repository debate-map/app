import {Button, Column, Row, Switch, Text} from "react-vcomponents";
import {BaseComponent, BaseComponentPlus} from "react-vextensions";
import {store} from "Store";
import {Observer} from "web-vcore";
import React, {useState} from "react";
import {MigrateUI} from "./DB/Migrate";
import {RequestsUI} from "./DB/Requests";
import {WatchersUI} from "./DB/Watchers";

@Observer
export class DBUI extends BaseComponent<{}, {}> {
	render() {
		const currentSubpage = store.main.db.subpage;
		return (
			<Switch>
				<RequestsUI/>
				{currentSubpage == "watchers" && <WatchersUI/>}
				{currentSubpage == "migrate" && <MigrateUI/>}
			</Switch>
		);
	}
}