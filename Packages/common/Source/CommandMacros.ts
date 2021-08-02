import {GetAsync, GetDoc, Command, dbp, DBHelper, GenerateUUID, CommandRunInfo} from "web-vcore/nm/mobx-graphlink.js";
import {IsString, IsFunction, Assert} from "web-vcore/nm/js-vextensions.js";
import {GetMap} from "./DB/maps.js";
import {GetUser} from "./DB/users.js";
import {AddAccessPolicy} from "./Commands/AddAccessPolicy.js";
import {SetUserData_Hidden} from "./Commands/SetUserData_Hidden.js";
import {AddUser} from "./Commands/AddUser.js";
import {AddArgumentAndClaim} from "./Commands/AddArgumentAndClaim.js";
import {AddChildNode, AddMap, DeleteNodeRating} from "./Commands.js";
import {AddMedia} from "./Commands/AddMedia.js";
import {AddNode} from "./Commands/AddNode.js";
import {AddNodeRevision} from "./Commands/AddNodeRevision.js";
import {AddNodeTag} from "./Commands/AddNodeTag.js";
import {AddPhrasing} from "./Commands/AddPhrasing.js";
import {AddShare} from "./Commands/AddShare.js";
import {AddTerm} from "./Commands/AddTerm.js";
import {AddTimeline} from "./Commands/AddTimeline.js";
import {ChangeClaimType} from "./Commands/ChangeClaimType.js";
import {CloneNode} from "./Commands/CloneNode.js";
import {DeleteMap} from "./Commands/DeleteMap.js";
import {DeleteMedia} from "./Commands/DeleteMedia.js";
import {DeleteNode} from "./Commands/DeleteNode.js";
import {DeleteNodeTag} from "./Commands/DeleteNodeTag.js";
import {DeletePhrasing} from "./Commands/DeletePhrasing.js";
import {DeleteShare} from "./Commands/DeleteShare.js";
import {DeleteTerm} from "./Commands/DeleteTerm.js";
import {LinkNode_HighLevel} from "./Commands/LinkNode_HighLevel.js";
import {LinkNode} from "./Commands/LinkNode.js";
import {ReverseArgumentPolarity} from "./Commands/ReverseArgumentPolarity.js";
import {SetNodeIsMultiPremiseArgument} from "./Commands/SetNodeIsMultiPremiseArgument.js";
import {SetNodeRating} from "./Commands/SetNodeRating.js";
import {UnlinkNode} from "./Commands/UnlinkNode.js";
import {UpdateLink} from "./Commands/UpdateLink.js";
import {UpdateMapDetails} from "./Commands/UpdateMapDetails.js";
import {UpdateMedia} from "./Commands/UpdateMedia.js";
import {UpdateNodeChildrenOrder} from "./Commands/UpdateNodeChildrenOrder.js";
import {UpdateNodeTag} from "./Commands/UpdateNodeTag.js";
import {UpdatePhrasing} from "./Commands/UpdatePhrasing.js";
import {UpdateShare} from "./Commands/UpdateShare.js";
import {UpdateTerm} from "./Commands/UpdateTerm.js";
import {CommandRun} from "./DB/commandRuns/@CommandRun.js";
import {GetUserHidden} from "./DB/userHiddens.js";
import {UpdateNodeAccessPolicy} from "./Commands/UpdateNodeAccessPolicy.js";

// general augmentations
// ==========

const commandsToNotEvenRecord: Array<typeof Command> = [
	// these are server-internal commands, with no need to be seen in website UI
	AddUser,
];
const commandsShowableInStream: Array<typeof Command> = [
	// terms
	AddTerm, UpdateTerm,
	// media
	AddMedia, DeleteMedia, UpdateMedia,
	// maps
	AddMap, AddShare, DeleteMap, DeleteShare, DeleteTerm, UpdateMapDetails, UpdateShare,
	// timelines
	//AddTimeline, AddTimelineStep, UpdateTimeline, UpdateTimelineStep, UpdateTimelineStepOrder, DeleteTimeline, DeleteTimelineStep,
	// nodes
	AddArgumentAndClaim, AddChildNode, AddNode, AddNodeRevision, AddNodeTag, AddPhrasing, ChangeClaimType, CloneNode,
	DeleteNode, DeleteNodeTag, DeletePhrasing, LinkNode_HighLevel, LinkNode, ReverseArgumentPolarity, SetNodeIsMultiPremiseArgument,
	SetNodeRating, DeleteNodeRating, UnlinkNode, UpdateLink, UpdateNodeAccessPolicy, UpdateNodeChildrenOrder, UpdateNodeTag, UpdatePhrasing,
];
Command.augmentValidate = (command: Command<any>)=>{
	if (command.parentCommand != null) return; // ignore subcommands (it would be redundant)
	const commandClass = command.constructor as typeof Command;
	if (commandsToNotEvenRecord.includes(commandClass)) return;

	const userHidden = GetUserHidden.NN(command.userInfo.id);
	command["user_addToStream"] = userHidden.addToStream;
};
Command.augmentDBUpdates = (command: Command<any>, db: DBHelper)=>{
	// some commands (eg. AddNodeRevision) need contraint-deferring till end of transaction, so just do that always (instant-checking doesn't really improve debugging in this context anyway)
	db.DeferConstraints = true;

	if (command.parentCommand != null) return; // ignore subcommands (it would be redundant)
	const commandClass = command.constructor as typeof Command;
	if (commandsToNotEvenRecord.includes(commandClass)) return;

	const makePublic_base = commandsShowableInStream.includes(commandClass)
		&& command["user_addToStream"]; // field set in augmentValidate

	const id = GenerateUUID();
	db.set(dbp`commandRuns/${id}`, new CommandRun({
		id,
		actor: command.userInfo.id,
		runTime: Date.now(),
		public_base: makePublic_base,
		commandName: commandClass.name,
		// Use "command.payload_orig" to be on the safe side, since "command.payload" is often modified during Validate();
		// 	normally that's fine, but this way's safer, to prevent private data leakage. (return-data should be/be-made sufficient for info-display needs)
		commandPayload: command.payload_orig,
		returnData: command.returnData,
	}));
};

// macros/decorators
// ==========

export function MapEdit(targetClass: Function);
export function MapEdit(mapIDKey: string);
export function MapEdit(...args) {
	let mapIDKey = "mapID";
	if (IsFunction(args[0])) {
		ApplyToClass(args[0]);
	} else {
		mapIDKey = args[0];
		return ApplyToClass;
	}

	function ApplyToClass(targetClass: typeof Command) {
		const Validate_old = targetClass.prototype["Validate"];
		targetClass.prototype["Validate"] = function() {
			const result = Validate_old.apply(this);
			const mapID = this.payload[mapIDKey];
			if (mapID) {
				const map = GetMap(mapID);
				if (map != null) {
					this.map_oldEditCount = map.edits ?? 0;
				}
			}
			return result;
		};

		const DeclareDBUpdates_old = targetClass.prototype.DeclareDBUpdates;
		targetClass.prototype.DeclareDBUpdates = function(db) {
			DeclareDBUpdates_old.call(this, db);
			if (this.map_oldEditCount != null) {
				const mapID = this.payload[mapIDKey];
				if (mapID) {
					db.set(dbp`maps/${mapID}/.edits`, this.map_oldEditCount + 1);
					db.set(dbp`maps/${mapID}/.editedAt`, Date.now());
				}
			}
		};
	}
}

export function UserEdit(targetClass: typeof Command) {
	const Validate_old = targetClass.prototype["Validate"];
	targetClass.prototype["Validate"] = function() {
		const result = Validate_old.apply(this);
		const user = GetUser(this.userInfo.id);
		if (user) {
			this.user_oldEditCount = user.edits ?? 0;
		}
		return result;
	};

	const DeclareDBUpdates_old = targetClass.prototype.DeclareDBUpdates;
	targetClass.prototype.DeclareDBUpdates = function(db) {
		DeclareDBUpdates_old.call(this, db);
		if (this.user_oldEditCount != null) {
			db.set(dbp`users/${this.userInfo.id}/.edits`, this.user_oldEditCount + 1);
			db.set(dbp`users/${this.userInfo.id}/.lastEditAt`, Date.now());
		}
	};
}