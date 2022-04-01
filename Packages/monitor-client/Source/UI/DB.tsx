import {Button, Column, Row, Switch, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {store} from "Store";
import {Observer} from "web-vcore";
import React, {useState} from "react";
import {MigrateUI} from "./DB/Migrate";
import {RequestsUI} from "./DB/Requests";

@Observer
export class DBUI extends BaseComponent<{}, {}> {
	render() {
		const currentSubpage = store.main.database.subpage;
		return (
			<Switch>
				<RequestsUI/>
				{currentSubpage == "migrate" && <MigrateUI/>}
			</Switch>
		);
	}
}