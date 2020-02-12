import {ShowMessageBox} from "react-vmessagebox";
import {observable} from "mobx";
import {ConvertDataToValidDBUpdates, ApplyDBUpdates, DBPath, GenerateUUID} from "mobx-firelink";
import {E} from "js-vextensions";
import {MeID} from "Subrepos/Server/Source/@Shared/Store/firebase/users";
import {User} from "Subrepos/Server/Source/@Shared/Store/firebase/users/@User";
import {MapType, Map} from "Subrepos/Server/Source/@Shared/Store/firebase/maps/@Map";
import {globalRootNodeID, globalMapID, MapNode} from "Subrepos/Server/Source/@Shared/Store/firebase/nodes/@MapNode";
import {MapNodeType} from "Subrepos/Server/Source/@Shared/Store/firebase/nodes/@MapNodeType";
import {MapNodeRevision} from "Subrepos/Server/Source/@Shared/Store/firebase/nodes/@MapNodeRevision";
import {ValidateDBData} from "Subrepos/Server/Source/@Shared/Utils/Store/DBDataValidator";
import {FirebaseDBShape} from "Subrepos/Server/Source/@Shared/Store/firebase";
import {GeneralData} from "Subrepos/Server/Source/@Shared/Store/firebase/general";

// Note: This is currently not used, and probably doesn`t even work atm.

// export default async function ResetCurrentDBRoot(database: firebase.Database) {
const sharedData = {} as {creatorInfo: any};
export async function ResetCurrentDBRoot() {
	const userKey = MeID();

	const data = {} as FirebaseDBShape;
	data.general = {} as any;
	data.general.data = {} as GeneralData;
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