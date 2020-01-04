import {ShowMessageBox} from "react-vmessagebox";
import {MapNodeRevision} from "Store/firebase/nodes/@MapNodeRevision";
import {MeID} from "Store/firebase/users";
import {ValidateDBData} from "Utils/Store/DBDataValidator";
import {GenerateUUID} from "Utils/General/KeyGenerator";
import {observable} from "mobx";
import {ConvertDataToValidDBUpdates, ApplyDBUpdates, DBPath} from "mobx-firelink";
import {FirebaseDBShape} from "Store/firebase";
import {E} from "js-vextensions";
import {User} from "Store/firebase/users/@User";
import {Map, MapType} from "../../../Store/firebase/maps/@Map";
import {MapNode, globalRootNodeID, globalMapID} from "../../../Store/firebase/nodes/@MapNode";
import {MapNodeType} from "../../../Store/firebase/nodes/@MapNodeType";

// Note: This is currently not used, and probably doesn`t even work atm.

// export default async function ResetCurrentDBRoot(database: firebase.Database) {
const sharedData = {} as {creatorInfo: any};
export async function ResetCurrentDBRoot() {
	const userKey = MeID();

	const data = {} as FirebaseDBShape;
	data.general = {} as any;
	data.general.data = {
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
	data.maps = observable.map();
	data.nodes = observable.map();
	data.nodeRevisions = observable.map();
	data.users = observable.map();

	sharedData.creatorInfo = {creator: userKey, createdAt: Date.now()};

	AddUser(data, userKey, new User().VSet({
		joinDate: Date.now(),
		permissionGroups: {basic: true, verified: true, mod: true, admin: true},
	}));
	AddMap(data, {name: "Global", type: MapType.Global, rootNode: globalRootNodeID} as Map, globalMapID);
	AddNode(data,
		new MapNode({type: MapNodeType.Category}),
		new MapNodeRevision({titles: {base: "Root"}}),
		globalRootNodeID);

	ValidateDBData(data);

	// todo
	// await ApplyDBUpdates({}, DBPath({}), ConvertDataToValidDBUpdates('', data));

	ShowMessageBox({message: "Done!"});
}

function AddUser(data: FirebaseDBShape, userID: string, extraInfo: User) {
	data.users[userID] = extraInfo;
}
function AddMap(data: FirebaseDBShape, entry: Map, id: string) {
	entry = E(sharedData.creatorInfo, entry);

	// data.maps[id || ++data.general.data.lastMapID] = entry as any;
	data.maps[id ?? GenerateUUID()] = entry as any;
}
function AddNode(data: FirebaseDBShape, node: MapNode, revision: MapNodeRevision, nodeID?: string) {
	node = E(sharedData.creatorInfo, node);
	revision = E(sharedData.creatorInfo, revision);

	nodeID = nodeID ?? GenerateUUID();
	const revisionID = GenerateUUID();

	node.currentRevision = revisionID;
	data.nodes[nodeID] = node as any;

	revision.node = nodeID;
	data.nodeRevisions[revisionID] = revision;
}