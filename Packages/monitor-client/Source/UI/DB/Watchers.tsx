import {Button, Column, Row, Switch, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {store} from "Store";
import {Observer} from "web-vcore";
import React, {useState} from "react";
import gql from "graphql-tag";
import {useMutation, useSubscription} from "web-vcore/nm/@apollo/client.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox";

export class LQWatcher {
	// todo
}

@Observer
export class WatchersUI extends BaseComponent<{}, {}> {
	render() {
		let {} = this.props;
		const adminKey = store.main.adminKey;

		const watchers = [] as LQWatcher[]; // todo

		return (
			<Column style={{flex: 1}}>
				<Row>
					<Button text="Refresh" onClick={()=>{
						// todo
					}}/>
				</Row>
				<Row>Watchers:</Row>
				<Row>TODO</Row>
				{watchers.map((watcher, index)=>{
					return <LQWatcherUI key={index} watcher={watcher}/>;
				})}
			</Column>
		);
	}
}

class LQWatcherUI extends BaseComponent<{watcher: LQWatcher}, {}> {
	render() {
		const {watcher} = this.props;
		return (
			<Row>TODO</Row>
		);
	}
}