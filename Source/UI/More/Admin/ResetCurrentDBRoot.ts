import {MapNode} from "../../../Store/firebase/nodes/@MapNode";
import {MapNodeType} from "../../../Store/firebase/nodes/@MapNodeType";
import {ShowMessageBox} from "react-vmessagebox";
import {MapType, Map} from "../../../Store/firebase/maps/@Map";
import UserExtraInfo from "../../../Store/firebase/userExtras/@UserExtraInfo";
import {FirebaseData} from "../../../Store/firebase";
import { GetUserID } from "Store/firebase/users";
import {ApplyDBUpdates} from "Frame/Database/DatabaseHelpers";
import {DBPath} from "../../../Frame/Database/DatabaseHelpers";
import { MapNodeRevision } from "Store/firebase/nodes/@MapNodeRevision";

// Note: This is currently not used, and probably doesn't even work atm.

//export default async function ResetCurrentDBRoot(database: firebase.Database) {
export async function ResetCurrentDBRoot() {
	let userKey = GetUserID();

	let data = {} as FirebaseData;
	data.general = {
		lastTermID: 0,
		lastTermComponentID: 0,
		lastImageID: 0,
		lastLayerID: 0,
		lastNodeRevisionID: 0,
		lastTimelineID: 0,
		lastTimelineStepID: 0,

		// these start at 100, since 1-100 are reserved
		lastMapID: 99,
		lastNodeID: 99,
	};
	data.maps = {};
	data.nodes = {};
	data.nodeRevisions = {};
	data.userExtras = {};

	AddUserExtras(data, userKey, new UserExtraInfo({
		joinDate: Date.now(),
		permissionGroups: {basic: true, verified: true, mod: true, admin: true},
	}));
	AddMap(data, {name: "Global", type: MapType.Global, rootNode: 1} as Map, 1);
	AddNode(data,
		new MapNode({type: MapNodeType.Category}),
		new MapNodeRevision({titles: {base: "Root"}, creator: userKey, approved: true}),
		1,
	);

	await ApplyDBUpdates(DBPath(), data);
	ShowMessageBox({message: "Done!"});
}

function AddUserExtras(data: FirebaseData, userID: string, extraInfo: UserExtraInfo) {
	data.userExtras[userID] = extraInfo;
}
function AddMap(data: FirebaseData, entry: Map, id?: number) {
	data.maps[id || ++data.general.lastMapID] = entry as any;
}
function AddNode(data: FirebaseData, node: MapNode, revision: MapNodeRevision, nodeID?: number) {
	nodeID = nodeID || ++data.general.lastNodeID;
	let revisionID = ++data.general.lastNodeRevisionID;

	node.currentRevision = revisionID;
	data.nodes[nodeID] = node as any;

	revision.node = nodeID;
	data.nodeRevisions[revisionID] = revision as any;
}