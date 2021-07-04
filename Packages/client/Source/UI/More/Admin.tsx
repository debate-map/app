import {Assert, AwaitTree, SleepAsync, E, IsObject} from "web-vcore/nm/js-vextensions.js";
import {dbVersion} from "Main";
import {ConvertDataToValidDBUpdates, GetAsync, GetDoc, GetDocs, SplitStringBySlash_Cached, ApplyDBUpdates} from "web-vcore/nm/mobx-graphlink.js";
import {Button, Column, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {PageContainer, Observer} from "web-vcore";
import {HasAdminPermissions, MeID, GraphDBShape} from "dm_common";

@Observer
export class AdminUI extends BaseComponentPlus({} as {}, {dbUpgrade_entryIndexes: [] as number[], dbUpgrade_entryCounts: [] as number[]}) {
	/* constructor(props) {
		super(props);
		//this.state = {env: envSuffix};
		this.SetEnvironment(envSuffix);
	}
	SetEnvironment(env: string) {
		var {version, firebaseConfig} = require(env == "production" ? "../../BakedConfig_Prod" : "../../BakedConfig_Dev");
		try {
			Firebase.initializeApp(firebaseConfig);
		} catch (err) {} // silence reinitialize warning (hot-reloading)
      Firebase.database.enableLogging(true);
		const rootRef = (Firebase as any).database().ref();
		this.SetState({fb: rootRef, env});
	} */

	render() {
		const {dbUpgrade_entryIndexes, dbUpgrade_entryCounts} = this.state;
		let isAdmin = HasAdminPermissions(MeID());
		// also check previous version for admin-rights (so we can increment db-version without losing our rights to complete the db-upgrade!)
		/*if (!isAdmin && MeID() != null) {
			isAdmin = GetDoc({inLinkRoot: false}, (a: any)=>(a.versions.get(`v${dbVersion - 1}-${DB_SHORT}`) as GraphDBShape).users.get(MeID())?.permissionGroups.admin) ?? false;
		}*/

		if (!isAdmin) return <PageContainer>Please sign in.</PageContainer>;
		return (
			<PageContainer scrollable={true}>
				<Row m="-10px 0"><h2>Database</h2></Row>
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
				</Row>
				<Row><h4>Testing</h4></Row>
				<Row>
					<Button text={"Throw async error"} onClick={async()=>{
						await SleepAsync(1000);
						throw new Error("Oh no!");
					}}/>
				</Row>

				{/* <Row m="-10px 0"><h2>Storage</h2></Row>
				<Row><h4>Backgound images</h4></Row>
				<Row>
					<Button text={'Create missing thumnails'} onClick={() => {
						ShowMessageBox({
							title: 'Create missing thumbnails?',
							message: 'This could take some time.', cancelButton: true,
							onOK: () => {
								CreateMissingThumbnails();
							},
						});
					}}/>
				</Row> */}
			</PageContainer>
		);
	}

	async MarkProgress(depth: number, entryIndex: number, entryCount?: number) {
		let {dbUpgrade_entryIndexes, dbUpgrade_entryCounts} = this.state;
		[dbUpgrade_entryIndexes, dbUpgrade_entryCounts] = [dbUpgrade_entryIndexes.slice(), dbUpgrade_entryCounts.slice()]; // use copies of arrays

		dbUpgrade_entryIndexes[depth] = entryIndex;
		if (entryCount != null) {
			dbUpgrade_entryCounts[depth] = entryCount;
		}
		this.SetState({dbUpgrade_entryIndexes, dbUpgrade_entryCounts});

		// every 100 entries, wait a bit, so UI can update
		if (entryIndex % 100 == 0) {
			await SleepAsync(10);
		}
	}
}

function AssertVersionRootPath(path: string) {
	const parts = SplitStringBySlash_Cached(path);
	Assert(parts.length == 2, "Version-root path must have exactly two segments.");
	Assert(parts[0] == "versions", 'Version-root path\'s first segment must be "versions".');
	Assert(parts[1].match("v[0-9]+-(dev|prod)"), 'Version-root path\'s second segment must match "v10-dev" pattern.');
}