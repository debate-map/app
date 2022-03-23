import {Button, Column, Row, Switch, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {store} from "Store";
import {Observer} from "web-vcore";
import React, {useState} from "react";
import gql from "graphql-tag";
import {useMutation, useSubscription} from "web-vcore/nm/@apollo/client.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox";

export class LogMessage {
	text: string;
}

export const MIGRATE_LOG_ENTRIES_SUBSCRIPTION = gql`
subscription MigrateMessages {
	migrateLogEntries {
		text
	}
}
`;

const START_MIGRATION = gql`
mutation($adminKey: String!, $toVersion: Int!) {
	startMigration(adminKey: $adminKey, toVersion: $toVersion) {
		migrationID
	}
}
`;

@Observer
export class MigrateUI extends BaseComponent<{}, {}> {
	render() {
		let {} = this.props;

		const [logEntries, setLogEntries] = useState([] as LogMessage[]);
		const {data, loading} = useSubscription(MIGRATE_LOG_ENTRIES_SUBSCRIPTION, {
			variables: {},
			onSubscriptionData: info=>{
				const newEntry = info.subscriptionData.data.migrateLogEntries;
				setLogEntries(logEntries.concat(newEntry));
			},
		});

		const [startMigration, info] = useMutation(START_MIGRATION);

		const adminKey = store.main.adminKey;
		return (
			<Column style={{flex: 1}}>
				<Row>
					<Text>Migrate to:</Text>
					<Button ml={5} text="V2" onClick={async()=>{
						ShowMessageBox({
							title: "Start migration to V2?",
							message: "Start migration to version 2?",
							cancelButton: true,
							onOK: async()=>{
								const {migrationID} = (await startMigration({
									variables: {toVersion: 2, adminKey},
								})).data;
							},
						});
					}}/>
					<Button ml={5} text="Stop" enabled={false}/>
				</Row>
				<Row>Migration log-messages:</Row>
				{logEntries.map((entry, index)=>{
					return <LogMessageUI key={index} message={entry}/>;
				})}
			</Column>
		);
	}
}

class LogMessageUI extends BaseComponent<{message: LogMessage}, {}> {
	render() {
		const {message} = this.props;
		return (
			<Row>{message.text}</Row>
		);
	}
}