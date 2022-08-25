import React, {useState} from "react";
import {store} from "Store";
import {TestSequence} from "Store/main/testing";
import {apolloClient} from "Utils/LibIntegrations/Apollo";
import {Observer} from "web-vcore";
import {gql, useSubscription} from "web-vcore/nm/@apollo/client";
import {observer} from "web-vcore/nm/mobx-react";
import {Button, Column, Row, TextArea, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions";

export class TestingLogEntry {
	text: string;
}

export const TESTING_LOG_ENTRIES_SUBSCRIPTION = gql`
subscription($adminKey: String!) {
	testingLogEntries(adminKey: $adminKey) {
		text
	}
}
`;

export const TestingUI = observer(()=>{
	const adminKey = store.main.adminKey;
	const uiState = store.main.testing;

	const [logEntries, setLogEntries] = useState([] as TestingLogEntry[]);
	const {data, loading} = useSubscription(TESTING_LOG_ENTRIES_SUBSCRIPTION, {
		variables: {adminKey},
		onSubscriptionData: info=>{
			const newEntry = info.subscriptionData.data.testingLogEntries as TestingLogEntry;
			setLogEntries(logEntries.concat(newEntry));
		},
	});

	return (
		<Row style={{flex: 1, height: "100%"}}>
			<Column style={{flex: 50, height: "100%"}}>
				<Row>
					<Text>Actions:</Text>
					<Button ml={5} text="TODO" onClick={()=>{
						// todo
					}}/>
				</Row>
				<Row>Main test-sequence</Row>
				<Row style={{flex: 1}}>
					<TextArea style={{flex: 1}} value={JSON.stringify(uiState.testSequences[0], null, "\t")} onChange={val=>{
						try {
							const sequence = JSON.parse(val);
							//uiState.testSequences[0] = sequence;
							uiState.testSequences = [sequence]; // must do in one go, since @O.ref is used
						} catch (ex) {
							alert(`Invalid json. Error:${ex}`);
						}
					}}/>
				</Row>
			</Column>
			<Column ml={5} style={{flex: 50, height: "100%"}}>
				<Row>
					<Text>Actions:</Text>
					<Button ml={5} text="Execute" onClick={async()=>{
						const result = await apolloClient.mutate({
							mutation: gql`
								mutation($adminKey: String!, $sequence: TestSequence!) {
									executeTestSequence(adminKey: $adminKey, sequence: $sequence) {
										message
									}
								}
							`,
							variables: {
								adminKey,
								sequence: uiState.testSequences[0],
							},
						});
						console.log("Got result:", result);
					}}/>
				</Row>
				{/*<Row>Results:</Row>
				<Row style={{flex: 1}}>
					<TextArea style={{flex: 1}} editable={false} value={""}/>
				</Row>*/}
				<Row>Testing log-messages:</Row>
				{logEntries.map((entry, index)=>{
					return <LogMessageUI key={index} message={entry}/>;
				})}
			</Column>
		</Row>
	);
});

class LogMessageUI extends BaseComponent<{message: TestingLogEntry}, {}> {
	render() {
		const {message} = this.props;
		return (
			<Row>{message.text}</Row>
		);
	}
}