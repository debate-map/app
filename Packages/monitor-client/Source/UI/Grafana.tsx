import {GetServerURL} from "dm_common";
import React from "react";
import {store} from "Store";
import {apolloClient} from "Utils/LibIntegrations/Apollo";
import {Observer} from "web-vcore";
import {gql, useQuery} from "web-vcore/nm/@apollo/client";
import {Button, Column, Row, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";

@Observer
export class GrafanaUI extends BaseComponent<{}, {}> {
	render() {
		let {} = this.props;
		const adminKey = store.main.adminKey;

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
		const password: string = data?.getGrafanaPassword ?? "<retrieving...>";

		return (
			<Column style={{flex: 1, height: "100%"}}>
				<div style={{position: "absolute", left: 2, top: 0, background: "#E5E8EC", borderRadius: "0 0 5px 0"}}>
					<Row>
						<Text sel>Username: admin</Text>
						<Text ml={5} sel>Password: {password}</Text>
						{/*<Button text="Retrieve password" onClick={()=>refetch()}/>*/}
					</Row>
				</div>
				<iframe src={GetServerURL("grafana", "/", window.location.href)} style={{height: "100%"}}/>
			</Column>
		);
	}
}