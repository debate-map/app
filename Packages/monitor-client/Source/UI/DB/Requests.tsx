import gql from "graphql-tag";
import React from "react";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {store} from "Store";
import {Observer, observer_simple} from "web-vcore";
import {useMutation, useQuery} from "web-vcore/nm/@apollo/client.js";
import {Button, Column, Row, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {observer} from "web-vcore/nm/mobx-react.js";
import {useForceUpdate} from "tree-grapher";

export class Mtx {
	sectionLifetimes: MtxSectionLifetimeMap;
}
export type MtxSectionLifetimeMap = {
	[key: string]: [number, number]
};

// synthesized from the above, for easier processing
export class MtxLifetime {
	path: string;
	startTime: number;
	duration: number;
}
function GetLifetimesInMap(map: MtxSectionLifetimeMap) {
	return Object.entries(map).map(entry=>{
		return new MtxLifetime().VSet({
			path: entry[0],
			startTime: entry[1][0],
			duration: entry[1][1],
		});
	});
}

export const MTX_RESULTS_QUERY = gql`
query($adminKey: String!) {
	mtxResults(adminKey: $adminKey) {
		sectionLifetimes
	}
}
`;

const CLEAR_MTX_RESULTS = gql`
mutation($adminKey: String!) {
	clearMtxResults(adminKey: $adminKey) {
		message
	}
}
`;

// todo: investigate why this decorator approach doesn't work for this case
/*@Observer
export const RequestsUI extends BaseComponent<{}, {}> {
	render() {*/

export const RequestsUI = observer(()=>{
	//const forceUpdate = useForceUpdate();

	const adminKey = store.main.adminKey;
	const {data, loading, refetch} = useQuery(MTX_RESULTS_QUERY, {
		variables: {adminKey},
	});
	const mtxResults: Mtx[] = data?.mtxResults ?? [];
	console.log("Got data:", mtxResults);

	const [clearMtxResults, info] = useMutation(CLEAR_MTX_RESULTS);

	return (
		<Column style={{flex: 1, height: "100%"}}>
			<Row>
				<Text>Actions:</Text>
				<Button ml={5} text="Refresh" onClick={async()=>{
					await refetch();
					//forceUpdate(); // fsr, this is currently necessary
				}}/>
				<Button ml={5} text="Clear (on app-server-rs)" onClick={async()=>{
					const {message} = (await clearMtxResults({
						variables: {adminKey},
					})).data;
					await refetch();
				}}/>
			</Row>
			<Row>Mtx results ({mtxResults.length})</Row>
			<ScrollView>
				{mtxResults.map((mtx, index)=>{
					return <MtxResultUI key={index} mtx={mtx}/>;
				})}
			</ScrollView>
		</Column>
	);
});

class MtxResultUI extends BaseComponent<{mtx: Mtx}, {}> {
	render() {
		const {mtx} = this.props;
		const lifetimes = GetLifetimesInMap(mtx.sectionLifetimes);
		return (
			<Column>
				{lifetimes.map((lifetime, index)=>{
					return <LifetimeUI key={index} lifetime={lifetime}/>;
				})}
			</Column>
		);
	}
}
class LifetimeUI extends BaseComponent<{lifetime: MtxLifetime}, {}> {
	render() {
		const {lifetime} = this.props;
		return (
			<Row>
				<Text>Path:{lifetime.path}</Text>
				<Text ml={5}>StartTime:{new Date(lifetime.startTime).toLocaleString("sv")}</Text>
				<Text ml={5}>Duration:{lifetime.duration}ms</Text>
			</Row>
		);
	}
}