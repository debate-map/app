import {DBPath, FirebaseApp, GetDataAsync, ProcessDBData, RemoveHelpers} from "../../Frame/Database/DatabaseHelpers";
import ResetCurrentDBRoot from "./Admin/ResetCurrentDBRoot";
import {styles} from "../../Frame/UI/GlobalStyles";
import {BaseComponent, BaseProps, Pre} from "../../Frame/UI/ReactGlobals";
import {firebaseConnect} from "react-redux-firebase";
import Button from "../../Frame/ReactComponents/Button";
import {ShowMessageBox} from "../../Frame/UI/VMessageBox";
import {E} from "../../Frame/General/Globals_Free";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import {Map, MapType} from "../../Store/firebase/maps/@Map";
import {MapNode} from "../../Store/firebase/nodes/@MapNode";
import UserExtraInfo from "../../Store/firebase/userExtras/@UserExtraInfo";
import Column from "../../Frame/ReactComponents/Column";
import Row from "../../Frame/ReactComponents/Row";
import {User} from "../../Store/firebase/users";
import {RatingsSet} from "../../Store/firebase/nodeRatings/@RatingsRoot";
import * as Firebase from "firebase";

// upgrade-funcs
//import "./Admin/DBUpgrades/UpgradeDB_2";
import Select from "../../Frame/ReactComponents/Select";
import {DataSnapshot} from "firebase";
var upgradeFuncs; // populated by modules above
export function AddUpgradeFunc(version: number, func: (oldData: FirebaseData)=>FirebaseData) {
	upgradeFuncs = upgradeFuncs || {};
	upgradeFuncs[version] = func;
}
require("./Admin/DBUpgrades/UpgradeDB_2");
require("./Admin/DBUpgrades/UpgradeDB_3");

export interface FirebaseData {
	general: GeneralData;
	users: {[key: string]: User};
	userExtras: {[key: string]: UserExtraInfo};
	maps: {[key: string]: Map};
	nodes: {[key: string]: MapNode};
	nodeExtras: {[key: string]: any};
	nodeRatings: {[key: string]: RatingsSet};
}
export interface GeneralData {
	lastNodeID: number;
}

//export default class AdminUI extends BaseComponent<{}, {fb: firebase.FirebaseApplication, env: string}> {
export default class AdminUI extends BaseComponent<{}, {}> {
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
		return (
			<Column style={E(styles.page)}>
				<Row m="-10px 0"><h2>Database</h2></Row>
				{/*<Row>
					<Pre>Environment: </Pre><Select options={["dev", "prod"]} value={this.state.env} onChange={val=>this.SetEnvironment(val)}/>
				</Row>*/}
				<Row><h4>General</h4></Row>
				<Row>
					<Button text={`Reset ${DBPath(`v${dbVersion}-${env_short}/`, false).slice(0, -1)}`} onClick={()=> {
						ShowMessageBox({
							title: `Reset ${DBPath(`v${dbVersion}-${env_short}/`, false).slice(0, -1)}?`,
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
						return <UpgradeButton key={pair.name} newVersion={parseInt(pair.name)} upgradeFunc={pair.value}/>
					})}
				</Column>
			</Column>
		);
	}
}

// Note that, when you change the dbRootVersion, you'll lose admin privileges.
// So to use the Upgrade button, you'll first need to manually set yourself as admin, in the new db-root (using the Firebase Database page).
export class UpgradeButton extends BaseComponent<{newVersion: number, upgradeFunc: (oldData: FirebaseData)=>FirebaseData}, {}> {
	render() {
		let {newVersion, upgradeFunc} = this.props;

		let oldVersionPath = `v${newVersion - 1}-${env_short}`;
		let newVersionPath = `v${newVersion}-${env_short}`;

		return (
			<Button text={`${oldVersionPath}   ->   ${newVersionPath}`} style={{whiteSpace: "pre"}} onClick={()=> {
				ShowMessageBox({
					title: `Upgrade ${oldVersionPath}   ->   ${newVersionPath}?`,
					message:
`The new db-root (${newVersionPath}) will be created as a transformation of the old db-root (${oldVersionPath}).
					
The old db-root will not be modified.`,
					cancelButton: true,
					onOK: async ()=> {
						let oldData = await GetDataAsync(`${oldVersionPath}/`, false) as FirebaseData;
						let newData = upgradeFunc(oldData);
						RemoveHelpers(newData); // remove "_key" and such

						let firebase = store.firebase.helpers;
						await firebase.Ref(`${newVersionPath}/`, false).set(newData);

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