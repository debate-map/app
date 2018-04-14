import {DBPath, FirebaseApp, GetDataAsync, RemoveHelpers} from "../../Frame/Database/DatabaseHelpers";
import {ResetCurrentDBRoot} from "./Admin/ResetCurrentDBRoot";
import {styles} from "../../Frame/UI/GlobalStyles";
import {BaseComponent, BaseProps} from "react-vextensions";
import {firebaseConnect} from "react-redux-firebase";
import {Button} from "react-vcomponents";
import {ShowMessageBox} from "react-vmessagebox";
import {E} from "js-vextensions";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import {Map, MapType} from "../../Store/firebase/maps/@Map";
import {MapNode} from "../../Store/firebase/nodes/@MapNode";
import UserExtraInfo from "../../Store/firebase/userExtras/@UserExtraInfo";
import {Column} from "react-vcomponents";
import {Row} from "react-vcomponents";
import {GetUserID} from "../../Store/firebase/users";
import {RatingsSet} from "../../Store/firebase/nodeRatings/@RatingsRoot";
import Firebase from "firebase";
//import "./Admin/DBUpgrades/UpgradeDB_2";
import {Select} from "react-vcomponents";
import {Term} from "../../Store/firebase/terms/@Term";
import TermComponent from "../../Store/firebase/termComponents/@TermComponent";
import {FirebaseData} from "../../Store/firebase";
import {IsUserAdmin} from "../../Store/firebase/userExtras";
import {SleepAsync} from "js-vextensions";
import {User} from "Store/firebase/users/@User";

// upgrade-funcs
var upgradeFuncs = {} as any; // populated by modules below
export function AddUpgradeFunc(version: number, func: (oldData: FirebaseData)=>FirebaseData) {
	upgradeFuncs[version] = func;
}
//require("./Admin/DBUpgrades/UpgradeDB_2");
//require("./Admin/DBUpgrades/UpgradeDB_3");
//require("./Admin/DBUpgrades/UpgradeDB_4");
//require("./Admin/DBUpgrades/UpgradeDB_5");
//require("./Admin/DBUpgrades/UpgradeDB_6");
require("./Admin/DBUpgrades/UpgradeDB_7");
require("./Admin/DBUpgrades/UpgradeDB_8");

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
		let admin = IsUserAdmin(GetUserID());
		if (!admin) return <Column style={E(styles.page)}>Please sign in.</Column>;

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
						let oldData = await GetDataAsync({inVersionRoot: false}, ...oldVersionPath.split("/")) as FirebaseData;
						let newData = upgradeFunc(oldData);
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

function ValidateDBData(data: FirebaseData) {
	for (let map of data.maps.VValues(true)) { AssertValidate("Map", map, `Map invalid`); }
	for (let node of data.nodes.VValues(true)) { AssertValidate("MapNode", node, `Node invalid`); }
	for (let revision of data.nodeRevisions.VValues(true)) { AssertValidate("MapNodeRevision", revision, `Node-revision invalid`); }
	for (let termComp of data.termComponents.VValues(true)) { AssertValidate("TermComponent", termComp, `Term-component invalid`); }
	for (let term of data.terms.VValues(true)) { AssertValidate("Term", term, `Term invalid`); }
}