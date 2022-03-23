import React, {useState} from "react";
import {store} from "Store";
import {Observer, P, RunInAction_Set} from "web-vcore";
import {Column, Row, TextInput, Text, CheckBox} from "web-vcore/nm/react-vcomponents";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";

export class HomeUI extends BaseComponent<{}, {}> {
	render() {
		return (
			<>
				<SettingsUI/>
				<article className="selectable">
				</article>
			</>
		);
	}
}

@Observer
class SettingsUI extends BaseComponent<{}, {}> {
	render() {
		let {} = this.props;
		const [showKey, setShowKey] = useState(false);
		return (
			<Column>
				<Row>
					<Text>Admin key</Text>
					<TextInput ml={5} type={showKey ? undefined : "password"} style={{width: 300}} value={store.main.adminKey} onChange={val=>RunInAction_Set(this, ()=>store.main.adminKey = val)}/>
					<CheckBox ml={5} text="Show" value={showKey} onChange={val=>setShowKey(val)}/>
				</Row>
			</Column>
		);
	}
}