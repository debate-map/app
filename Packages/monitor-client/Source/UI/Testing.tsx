import React from "react";
import {store} from "Store";
import {TestSequence} from "Store/main/testing";
import {Observer} from "web-vcore";
import {Button, Column, Row, TextArea, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions";

@Observer
export class TestingUI extends BaseComponent<{}, {}> {
	render() {
		const adminKey = store.main.adminKey;
		const uiState = store.main.testing;

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
								uiState.testSequences[0] = sequence;
							} catch (ex) {
								alert(`Invalid json. Error:${ex}`);
							}
						}}/>
					</Row>
				</Column>
				<Column ml={5} style={{flex: 50, height: "100%"}}>
					<Row>
						<Text>Actions:</Text>
						<Button ml={5} text="Execute" onClick={()=>{
							// todo
						}}/>
					</Row>
					<Row>Results:</Row>
					<Row style={{flex: 1}}>
						<TextArea style={{flex: 1}} editable={false} value={""}/>
					</Row>
				</Column>
			</Row>
		);
	}
}