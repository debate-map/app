import {gql} from "@apollo/client";
import React, {useState} from "react";
import {store} from "Store";
import {Observer, P, RunInAction_Set} from "web-vcore";
import {useMutation, useQuery} from "web-vcore/nm/@apollo/client";
import {observer} from "web-vcore/nm/mobx-react";
import {Column, Row, TextInput, Text, CheckBox, Button, TextArea} from "web-vcore/nm/react-vcomponents";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox";

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

class BasicInfo {
	static empty() {
		return new BasicInfo().VSet({
			memUsed: -1,
		});
	}
	memUsed: number;
}

// see Requests.ts for why we can't use the comp-approach
/*@Observer
class SettingsUI extends BaseComponent<{}, {}> {
	render() {*/
const SettingsUI = observer(()=>{
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
		</Column>
	);
});