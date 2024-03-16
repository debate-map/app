import {GetServerURL} from "dm_common";
import React, {useState} from "react";
import {store} from "Store";
import {apolloClient} from "Utils/LibIntegrations/Apollo";
import {CopyText, Observer} from "web-vcore";
import {gql, useQuery} from "web-vcore/nm/@apollo/client";
import {Button, CheckBox, Column, Row, Text, TextInput} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";

@Observer
export class GrafanaUI extends BaseComponent<{}, {}> {
	render() {
		let {} = this.props;
		const adminKey = store.main.adminKey;

		const [showPassword, setShowPassword] = useState(false);
		const {data, loading, refetch} = useQuery(gql`
			query($adminKey: String!) {
				getGrafanaPassword(adminKey: $adminKey)
			}
		`, {
			variables: {adminKey},
			// not sure if these are needed
			fetchPolicy: "no-cache",
			nextFetchPolicy: "no-cache",
		});
		const password: string = data?.getGrafanaPassword ?? "";

		return (
			<Column style={{flex: 1, height: "100%"}}>
				<div style={{position: "absolute", left: 2, top: 0, background: "#E5E8EC", borderRadius: "0 0 5px 0"}}>
					<Row p="0 5px">
						<Text sel>Username: admin</Text>
						<Text ml={5}>Password:</Text>
						<TextInput ml={5} type={showPassword ? undefined : "password"} style={{width: 300, fontSize: 12}} value={password} editable={false}/>
						<Button ml={5} p="0 5px" text="Copy" onClick={()=>CopyText(password)}/>
						<CheckBox ml={5} text="Show" value={showPassword} onChange={val=>setShowPassword(val)}/>
					</Row>
				</div>
				<iframe src={GetServerURL("grafana", "/", {restrictToRecognizedHosts: true, claimedClientURL: window.location.href})} style={{height: "100%"}}/>
			</Column>
		);
	}
}