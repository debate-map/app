import {gql} from "@apollo/client";
import React, {useState} from "react";
import {store} from "Store";
import {Observer, P, RunInAction_Set} from "web-vcore";
import {useQuery} from "web-vcore/nm/@apollo/client";
import {observer} from "web-vcore/nm/mobx-react";
import {Column, Row, TextInput, Text, CheckBox, Button, TextArea} from "web-vcore/nm/react-vcomponents";
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
				<Text>Admin key</Text>
				<TextInput ml={5} type={showKey ? undefined : "password"} style={{width: 300}} value={store.main.adminKey} onChange={val=>RunInAction_Set(/*this,*/ ()=>store.main.adminKey = val)}/>
				<CheckBox ml={5} text="Show" value={showKey} onChange={val=>setShowKey(val)}/>
			</Row>
			<Row>
				<Text>Basic info</Text>
				<Button ml={5} text="Refresh" onClick={()=>{
					refetch();
				}}/>
			</Row>
			<Row>
				<Text>MemUsed:{basicInfo.memUsed.toLocaleString()} bytes</Text>
				{/*<TextArea value={JSON.stringify(basicInfo)}/>*/}
			</Row>
		</Column>
	);
});