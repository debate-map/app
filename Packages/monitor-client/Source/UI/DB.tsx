import {Column, Switch} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {store} from "Store";
import {Observer, SubNavBar, SubNavBarButton} from "web-vcore";
import React from "react";

@Observer
export class DBUI extends BaseComponentPlus({} as {}, {}) {
	render() {
		const currentSubpage = store.main.db.subpage;
		return (
			<Switch>
				<MigrateUI/>
			</Switch>
		);
	}
}

class MigrateUI extends BaseComponent<{}, {}> {
	render() {
		let {} = this.props;
		return (
			<Column>
				TODO2
			</Column>
		);
	}
}