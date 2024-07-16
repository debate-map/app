import {gql, useMutation, useQuery} from "@apollo/client";
import React, {useState} from "react";
import {store} from "Store";
import {Observer, P, RunInAction_Set} from "web-vcore";

import {observer} from "mobx-react";
import {Column, Row, TextInput, Text, CheckBox, Button, TextArea} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";
import {ShowMessageBox} from "react-vmessagebox";
import {formatBytes} from "../Utils/UI/General.js";

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

export const RESTART_APP_SERVER_MUTATION = gql`
mutation($adminKey: String!) {
	restartAppServer(adminKey: $adminKey) {
		message
	}
}
`;

export const BASIC_INFO_QUERY = gql`
query($adminKey: String!) {
	basicInfo(adminKey: $adminKey)
}
`;

export const HEALTH_STATS_QUERY = gql`
query($adminKey: String!) {
	healthStats(adminKey: $adminKey) {
		filesystem,
		blocks1K,
		used,
		available,
		usePercent,
		mountedOn,
	}
}
`;

class BasicInfo {
	static empty() {
		return new BasicInfo().VSet({
			memUsed: -1,
		});
	}
	memUsed: number;
}

class HealthStats {
	static empty() {
		return new HealthStats().VSet({
			filesystem: "",
			blocks1K: -1,
			used: -1,
			available: -1,
			usePercent: -1,
			mountedOn: "",
		});
	}

	filesystem: string;
	blocks1K: number;
	used: number;
	available: number;
	usePercent: number;
	mountedOn: string;

}

// see Requests.ts for why we can't use the comp-approach
/*@Observer
class SettingsUI extends BaseComponent<{}, {}> {
	render() {*/
const SettingsUI = observer(()=>{ // todo: replace with "observer_mgl", if it works (ie. doesn't conflict with use of useMutation and such)
	//let {} = this.props;
	const adminKey = store.main.adminKey;

	const [restartAppServer, info] = useMutation(RESTART_APP_SERVER_MUTATION);

	const {data, loading, refetch} = useQuery(BASIC_INFO_QUERY, {
		variables: {adminKey},
		// not sure if these are needed
		fetchPolicy: "no-cache",
		nextFetchPolicy: "no-cache",
	});
	const basicInfo: BasicInfo = data?.basicInfo ?? BasicInfo.empty();

	const {data: dataHealth, loading: loadingHealth, refetch: refetchHealth} = useQuery(HEALTH_STATS_QUERY, {
		variables: {adminKey},
		// not sure if these are needed
		fetchPolicy: "no-cache",
		nextFetchPolicy: "no-cache",
	});
	const healthData: HealthStats[] = dataHealth?.healthStats ?? [];

	const storageHealth = healthData.find(a=>a.mountedOn == "/pgdata")
		// if no "/pgdata" filesystem was found, fallback to finding the stats for whichever filesystem has the most usage
		// (for some reason, rancher desktop doesn't seem to mount a separate filesystem for the "/pgdata" directory; it must have some other "fake" filesystem implementation for K8s PVCs)
		?? healthData.OrderByDescending(a=>a.usePercent).FirstOrX()
		?? HealthStats.empty();

	let storageHealthColor = "";
	if (storageHealth.usePercent >= 90) {
		storageHealthColor = "#dc3545";
	} else if (storageHealth.usePercent >= 70) {
		storageHealthColor = "#ffc107";
	} else {
		storageHealthColor = "#28a745";
	}

	const [showKey, setShowKey] = useState(false);
	return (
		<Column>
			<Row>
				<Text>Admin key:</Text>
				<TextInput ml={5} type={showKey ? undefined : "password"} style={{width: 300}} value={store.main.adminKey} onChange={val=>RunInAction_Set(/*this,*/ ()=>store.main.adminKey = val)}/>
				<CheckBox ml={5} text="Show" value={showKey} onChange={val=>setShowKey(val)}/>
			</Row>
			<Row mt={5}>
				<Text>Actions:</Text>
				<Button ml={5} text="Restart app-server" onClick={()=>{
					ShowMessageBox({
						title: "Restart app-server?",
						message: `
							Notes on restarting the app-server:
							* May causes a page refresh for users on the website. (generally not serious, but can clear text currently being typed)

							Do you want to continue?
						`.AsMultiline(0),
						cancelButton: true,
						onOK: async()=>{
							const res = (await restartAppServer({
								variables: {adminKey},
							})).data.restartAppServer;
							const success = res.message == "success";
							ShowMessageBox({
								title: `Restart ${success ? "succeeded" : "failed"}`,
								message: success
									? `
										App-server was successfully restarted; website should be accessible again in a few seconds.
										(if not, then the kubernetes cluster is probably waiting for memory to clear up; try refreshing the website in a few minutes)
									`.AsMultiline(0)
									: `App-server failed to restart. (either that, or the response was malformed: ${JSON.stringify(res)})`,
							});
						},
					});
				}}/>
			</Row>
			<Row mt={5}>
				<Text>Basic info</Text>
				<Button ml={5} text="Refresh" onClick={()=>{
					refetch();
				}}/>
			</Row>
			<Column ml={10}>
				<Row>
					<Text>MemUsed:{basicInfo.memUsed.toLocaleString()} bytes</Text>
					{/*<TextArea value={JSON.stringify(basicInfo)}/>*/}
				</Row>
			</Column>
			<Row mt={5}>
				<Text>Basic Health Stats</Text>
				<Button ml={5} text="Refresh" onClick={()=>{
					refetchHealth();
				}}/>
			</Row>
			<Column ml={10}>
				<Row>
					<Text>Persistent Volume Claim: <span style={{
						marginLeft: 5,
						color: storageHealthColor,
					}}>{formatBytes(storageHealth.used)} / {formatBytes(storageHealth.available)} ({storageHealth.usePercent}%)</span></Text>
				</Row>
			</Column>
		</Column>
	);
});