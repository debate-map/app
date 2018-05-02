import {ValidateDBData} from "Server/Command";
import {StartStateDataOverride, StopStateDataOverride} from "UI/@Shared/StateOverrides";
import {E, SleepAsync} from "js-vextensions";
import {Button, Column, Row} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";
import {ShowMessageBox} from "react-vmessagebox";
import {DBPath, GetDataAsync, RemoveHelpers} from "../../Frame/Database/DatabaseHelpers";
import {styles} from "../../Frame/UI/GlobalStyles";
import {FirebaseData} from "../../Store/firebase";
import {IsUserAdmin} from "../../Store/firebase/userExtras";
import {GetUserID} from "../../Store/firebase/users";
import {ResetCurrentDBRoot} from "./Admin/ResetCurrentDBRoot";

type UpgradeFunc = (oldData: FirebaseData, markProgress: MarkProgressFunc)=>Promise<FirebaseData>;
type MarkProgressFunc = (depth: number, entryIndex: number, entryCount?: number)=>void;

// upgrade-funcs
var upgradeFuncs = {} as any; // populated by modules below
export function AddUpgradeFunc(version: number, func: UpgradeFunc) {
	upgradeFuncs[version] = func;
}
//require("./Admin/DBUpgrades/UpgradeDB_2");
//require("./Admin/DBUpgrades/UpgradeDB_3");
//require("./Admin/DBUpgrades/UpgradeDB_4");
//require("./Admin/DBUpgrades/UpgradeDB_5");
//require("./Admin/DBUpgrades/UpgradeDB_6");
//require("./Admin/DBUpgrades/UpgradeDB_7");
//require("./Admin/DBUpgrades/UpgradeDB_8");
//require("./Admin/DBUpgrades/UpgradeDB_9");
require("./Admin/DBUpgrades/UpgradeDB_10");

//export default class AdminUI extends BaseComponent<{}, {fb: firebase.FirebaseApplication, env: string}> {
export default class AdminUI extends BaseComponent<{}, {dbUpgrade_entryIndexes: number[], dbUpgrade_entryCounts: number[]}> {
	static defaultState = {dbUpgrade_entryIndexes: [], dbUpgrade_entryCounts: []};
	/*constructor(props) {
		super(props);
		//this.state = {env: envSuffix};
		this.SetEnvironment(envSuffix);
	}
	SetEnvironment(env: string) {
		var {version, firebaseConfig} = require(env == "prod" ? "../../BakedConfig_Prod" : "../../BakedConfig_Dev");
		try {
			Firebase.initializeApp(firebaseConfig);
		} catch (err) {} // silence reinitialize warning (hot-reloading)
      Firebase.database.enableLogging(true);
		const rootRef = (Firebase as any).database().ref();
		this.SetState({fb: rootRef, env});
	}*/

	render() {
		let admin = IsUserAdmin(GetUserID());
		if (!admin) return <Column style={E(styles.page)}>Please sign in.</Column>;

		let {dbUpgrade_entryIndexes, dbUpgrade_entryCounts} = this.state;

		return (
			<Column style={E(styles.page)}>
				<Row m="-10px 0"><h2>Database</h2></Row>
				{/*<Row>
					<Pre>Environment: </Pre><Select options={["dev", "prod"]} value={this.state.env} onChange={val=>this.SetEnvironment(val)}/>
				</Row>*/}
				<Row><h4>General</h4></Row>
				<Row>
					<Button text={`Reset ${DBPath(`v${dbVersion}-${ENV_SHORT}/`, false).slice(0, -1)}`} onClick={()=> {
						ShowMessageBox({
							title: `Reset ${DBPath(`v${dbVersion}-${ENV_SHORT}/`, false).slice(0, -1)}?`,
							message: `This will clear all existing data in this root, then replace it with a fresh, initial state.`, cancelButton: true,
							onOK: ()=> {
								ResetCurrentDBRoot();
							}
						});
					}}/>
				</Row>
				<Row mt={5}><h4>Upgrader</h4></Row>
				<Column style={{alignItems: "flex-start"}}>
					{upgradeFuncs.Props().map(pair=> {
						return <UpgradeButton key={pair.name} newVersion={parseInt(pair.name)} upgradeFunc={pair.value} markProgress={this.MarkProgress.bind(this)}/>
					})}
				</Column>
				{dbUpgrade_entryIndexes.length > 0 &&
					<Row>
						<span>Progress: </span>
						{dbUpgrade_entryIndexes.map((entryIndex, depth)=> {
							return <span key={depth}>{depth > 0 ? " -> " : ""}{entryIndex + 1}/{dbUpgrade_entryCounts[depth]}</span>;
						})}
					</Row>}
				<Row><h4>Testing</h4></Row>
				<Row>
					<Button text={`Throw async error`} onClick={async ()=> {
						await SleepAsync(1000);
						throw new Error("Oh no!");
					}}/>
				</Row>
			</Column>
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

// Note that, when you change the dbRootVersion, you'll lose admin privileges.
// So to use the Upgrade button, you'll first need to manually set yourself as admin, in the new db-root (using the Firebase Database page).
export class UpgradeButton extends BaseComponent<{newVersion: number, upgradeFunc: UpgradeFunc, markProgress: MarkProgressFunc}, {}> {
	render() {
		let {newVersion, upgradeFunc, markProgress} = this.props;

		let oldVersionPath = `v${newVersion - 1}-${ENV_SHORT}`;
		let newVersionPath = `v${newVersion}-${ENV_SHORT}`;

		return (
			<Button text={`${oldVersionPath}   ->   ${newVersionPath}`} style={{whiteSpace: "pre"}} onClick={()=> {
				ShowMessageBox({
					title: `Upgrade ${oldVersionPath}   ->   ${newVersionPath}?`,
					message:
`The new db-root (${newVersionPath}) will be created as a transformation of the old db-root (${oldVersionPath}).
					
The old db-root will not be modified.`,
					cancelButton: true,
					onOK: async ()=> {
						let oldData = await GetDataAsync({inVersionRoot: false}, ...oldVersionPath.split("/")) as FirebaseData;
						StartStateDataOverride(`firebase/data/${DBPath()}`, oldData);
						try {
							var newData = await upgradeFunc(oldData, markProgress);
						} finally {
							StopStateDataOverride();
						}
						RemoveHelpers(newData); // remove "_key" and such

						if (newVersion >= dbVersion) {
							ValidateDBData(newData);
						}

						let firebase = store.firebase.helpers;
						await firebase.ref(DBPath(`${newVersionPath}/`, false)).set(newData);

						ShowMessageBox({
							title: `Upgraded: ${oldVersionPath}   ->   ${newVersionPath}`,
							message: `Done!`
						});
					}
				});
			}}/>
		);
	}
}