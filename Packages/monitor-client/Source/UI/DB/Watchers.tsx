import {Button, Column, Row, Switch, Text} from "react-vcomponents";
import {BaseComponent, BaseComponentPlus} from "react-vextensions";
import {store} from "Store";
import {ES, Observer} from "web-vcore";
import React, {useState} from "react";
import gql from "graphql-tag";
import {useMutation, useQuery, useSubscription} from "@apollo/client";
import {ShowMessageBox} from "react-vmessagebox";
import {observer} from "mobx-react";
import {ScrollView} from "react-vscrollview";

export class LQInstance {
	tableName: string;
	filter: any;
	lastEntries: any[];
	entryWatcherCount: number;
}

export const LQ_INSTANCES_QUERY = gql`
query($adminKey: String!) {
	lqInstances(adminKey: $adminKey) {
		tableName
		filter
		lastEntries
		entryWatcherCount
	}
}
`;

export const columnWidths = [.04, .06, .3, .6];

export const WatchersUI = observer(()=>{
	const adminKey = store.main.adminKey;
	const uiState = store.main.db.watchers;

	const {data, loading, refetch} = useQuery(LQ_INSTANCES_QUERY, {
		variables: {adminKey},
	});
	const lqis_raw: LQInstance[] = data?.lqInstances ?? [];
	// app-server sends the entries "ordered" by end-time (since that's when it knows it can send it), but we want the entries sorted by start-time
	const lqis = lqis_raw.OrderBy(lqi=>`${lqi.tableName};${lqi.filter}`);
	console.log("Got data:", lqis);

	return (
		<Column style={{flex: 1, height: "100%"}}>
			<Row>
				<Button text="Refresh" onClick={async()=>{
					await refetch();
				}}/>
			</Row>
			<Row>Live-query instances:</Row>
			<Row style={{height: 40, padding: 10}}>
				<span style={{flex: columnWidths[0], fontWeight: 500, fontSize: 15}}>Watchers</span>
				<span style={{flex: columnWidths[1], fontWeight: 500, fontSize: 15}}>Table</span>
				<span style={{flex: columnWidths[2], fontWeight: 500, fontSize: 15}}>Filter</span>
				<span style={{flex: columnWidths[3], fontWeight: 500, fontSize: 15}}>Entries</span>
			</Row>
			<ScrollView>
				{lqis.map((lqi, index)=>{
					return <LQInstanceUI key={index} index={index} lqi={lqi}/>;
				})}
			</ScrollView>
		</Column>
	);
});

class LQInstanceUI extends BaseComponent<{index: number, lqi: LQInstance}, {}> {
	render() {
		const {index, lqi} = this.props;
		return (
			<Column p="7px 10px" style={ES(
				{background: index % 2 == 0 ? "rgba(200,200,200,.5)" : "rgba(200,200,200,1)"},
			)}>
				<Row sel>
					<span style={{
						flex: columnWidths[0],
						/*display: "flex",
						alignItems: "center", justifyContent: "center",*/
					}}>{lqi.entryWatcherCount}</span>
					<span style={{flex: columnWidths[1]}}>{lqi.tableName}</span>
					<span style={{flex: columnWidths[2]}}>{JSON.stringify(lqi.filter)}</span>
					<Column style={{flex: columnWidths[3]}}>{lqi.lastEntries.map((entry, i)=>{
						return <span key={index} style={{border: "1px solid black"}}>{JSON.stringify(entry)}</span>;
					})}</Column>
				</Row>
			</Column>
		);
	}
}