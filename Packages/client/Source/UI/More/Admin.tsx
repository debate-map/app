import {Assert, AwaitTree, SleepAsync, E, IsObject, StartDownload} from "js-vextensions";
import {ConvertDataToValidDBUpdates, GetAsync, GetDoc, GetDocs, SplitStringBySlash_Cached} from "mobx-graphlink";
import {Button, Column, Row, TextArea, Text} from "react-vcomponents";
import {BaseComponent, BaseComponentPlus} from "react-vextensions";
import {ShowMessageBox} from "react-vmessagebox";
import {PageContainer, Observer, RunInAction_Set, Link} from "web-vcore";
import {HasAdminPermissions, MeID, GraphDBShape, GetServerURL} from "dm_common";
import {FetchResult, gql} from "@apollo/client";
import {GetUserInfoFromStoredJWT, GetUserInfoJWTString} from "Utils/AutoRuns/UserInfoCheck.js";
import {store} from "../../Store/index.js";
import {apolloClient, GetAppServerURL, GetMonitorURL} from "../../Utils/LibIntegrations/Apollo.js";

@Observer
export class AdminUI extends BaseComponentPlus({} as {}, {}) {
	render() {
		const isAdmin = HasAdminPermissions(MeID());

		if (!isAdmin) return <PageContainer>Please sign in.</PageContainer>;
		return (
			<PageContainer scrollable={true}>
				<Row>
					<Text>{`Note: If an admin command you're looking for is not here, you may be looking for the `}</Text>
					<Link text="monitoring portal/subdomain" to={GetMonitorURL("/")}/>
					<Text>.</Text>
				</Row>

				<Row><h2>General</h2></Row>
				<Row><h4>Testing</h4></Row>
				<Row>
					<Button text={"Throw async error"} onClick={async()=>{
						await SleepAsync(1000);
						throw new Error("Test async-error thrown...");
					}}/>
				</Row>

				<Row mt={10}><h2>Database</h2></Row>
				{/* <Row>
					<Pre>Environment: </Pre><Select options={["dev", "prod"]} value={this.state.env} onChange={val=>this.SetEnvironment(val)}/>
				</Row> */}
				<Row><h4>General</h4></Row>
				<Row>
					{/*<Button text={`Reset ${DBPath({})}`} onClick={()=>{
						ShowMessageBox({
							title: `Reset ${DBPath({})}?`,
							message: "This will clear all existing data in this root, then replace it with a fresh, initial state.", cancelButton: true,
							onOK: ()=>{
								ResetCurrentDBRoot();
							},
						});
					}}/>*/}
					<Button text={`Download database backup`} onClick={async()=>{
						const jwtToken = GetUserInfoJWTString();
						const graphqlEndpoint = GetAppServerURL("/graphql");
						const pgdump_sql_response = await fetch(graphqlEndpoint, {
							method: "POST",
							body: JSON.stringify({
								operationName: null,
								query: `query { getDBDump { pgdumpSql } }`,
								variables: {},
							}),
							credentials: "include",
							headers: {
								"Content-Type": "application/json",
								authorization: `Bearer ${jwtToken}`,
							},
						});
						const response_structure_str = await pgdump_sql_response.text();
						let response_structure;
						try {
							response_structure = JSON.parse(response_structure_str);
						} catch (ex) {
							return void ShowMessageBox({title: "Error parsing", message: `Got error parsing response-structure as json. Response-structure-string:${response_structure_str}`});
						}
						if (response_structure.errors) {
							return void ShowMessageBox({title: "Error in graphql/server", message: `Got graphql/server errors:${JSON.stringify(response_structure.errors)}`});
						}
						const pgdumpSqlStr = response_structure.data.getDBDump.pgdumpSql;

						const CurrentTime_SafeStr = ()=>new Date().toLocaleString("sv").replace(/[ :]/g, "-"); // ex: 2021-12-10-09-18-52
						const fileName = `DebateMap_DBDump_${CurrentTime_SafeStr()}.sql`;
						StartDownload(pgdumpSqlStr, fileName);
					}}/>
				</Row>
				<Row><h4>GraphQL test</h4></Row>
				<Row>
					<TextArea autoSize={true} value={store.main.more.graphqlTestQuery} onChange={val=>RunInAction_Set(this, ()=>store.main.more.graphqlTestQuery = val)}/>
				</Row>
				<Row mt={5}>
					<Button text="Execute as query" onClick={async()=>{
						const result = await apolloClient.query({
							query: gql(store.main.more.graphqlTestQuery),
							variables: {},
						});
						console.log("GraphQL result:", result);
						const resultData = result.data;
						alert(`GraphQL result data: ${JSON.stringify(resultData)}`);
					}}/>
					<Button ml={10} text="Execute as subscription" onClick={async()=>{
						const fetchResult_subscription = apolloClient.subscribe({
							query: gql(store.main.more.graphqlTestQuery),
							variables: {},
						});
						const fetchResult = await new Promise<FetchResult<any>>(resolve=>{
							const subscription = fetchResult_subscription.subscribe(data=>{
								subscription.unsubscribe(); // unsubscribe as soon as first (and only) result is received
								resolve(data);
							});
						});
						console.log(`GraphQL subscription, first result:`, fetchResult);
						alert(`GraphQL subscription, first result: ${JSON.stringify(fetchResult)}`);
					}}/>
				</Row>
			</PageContainer>
		);
	}
}