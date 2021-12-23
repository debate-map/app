import {Assert} from "web-vcore/nm/js-vextensions.js";
import {Command, DBHelper, dbp, GenerateUUID, Validate} from "web-vcore/nm/mobx-graphlink.js";
import {CommandRun, RLSTargetSet} from "../DB/commandRuns/@CommandRun.js";
import {GetDBReadOnlyMessage, IsDBReadOnly} from "../DB/globalData.js";
import {GetUserHidden} from "../DB/userHiddens.js";
import {GetCommandRunMetaForClass} from "./CommandRunMeta.js";

// general augmentations
// ==========

Command.augmentValidate = (command: Command<any>)=>{
	if (IsDBReadOnly()) throw new Error(`Database is currently read-only. Reason: ${GetDBReadOnlyMessage()}`);

	const commandClass = command.constructor as typeof Command;
	//if (commandsToNotEvenRecord.includes(commandClass)) return;
	const commandRunMeta = GetCommandRunMetaForClass(commandClass);
	if (commandRunMeta?.record) {
		const userHidden = GetUserHidden.NN(command.userInfo.id);
		command["user_addToStream"] = userHidden.addToStream;
	}
};

function CommandXOrAncestorCanShowInStream(command: Command<any>|n) {
	if (command) {
		const commandClass = command.constructor as typeof Command;
		const commandRunMeta = GetCommandRunMetaForClass(commandClass);
		if (commandRunMeta?.canShowInStream) return true;
		if (command.parentCommand && CommandXOrAncestorCanShowInStream(command.parentCommand)) return true;
	}
	return false;
}

Command.augmentDBUpdates = (command: Command<any>, db: DBHelper)=>{
	// some commands (eg. AddNodeRevision) need contraint-deferring till end of transaction, so just do that always (instant-checking doesn't really improve debugging in this context anyway)
	db.DeferConstraints = true;

	const commandClass = command.constructor as typeof Command;
	//if (commandsToNotEvenRecord.includes(commandClass)) return;
	const commandRunMeta = GetCommandRunMetaForClass(commandClass);

	//const ancestorCommandInStream = CommandXOrAncestorCanShowInStream(command.parentCommand) && command["user_addToStream"];
	const ancestorCommandCanBeInStream = CommandXOrAncestorCanShowInStream(command.parentCommand);
	console.log("@Class:", commandClass.name,
		"Record:", commandRunMeta?.record, "Record_CancelIfX:", commandRunMeta?.record_cancelIfAncestorCanBeInStream,
		"ancestorCommandCanBeInStream:", ancestorCommandCanBeInStream, "user_addToStream:", command["user_addToStream"]);
	if (commandRunMeta?.record && (!commandRunMeta.record_cancelIfAncestorCanBeInStream || !ancestorCommandCanBeInStream)) {
		const makePublic_base = Boolean(commandRunMeta.canShowInStream && command["user_addToStream"]); // user_addToStream set in augmentValidate

		const rlsTargets = new RLSTargetSet();
		for (const pathInfo of commandRunMeta.rlsTargetPaths) {
			let value: any;
			for (const [i, pathNode] of pathInfo.fieldPath.entries()) {
				// use special handling for first path-node
				if (i == 0) {
					if (pathNode == "payload") {
						//value = command.payload;
						value = command.payload_orig;
					} else if (pathNode == "returnData") {
						value = command.returnData;
					} else {
						Assert(false, "Invalid first path-node of rls-target field-path.");
					}
				} else {
					Assert(value[pathNode] != null, `For rls-target field-path, path-node at index ${i} evaluated to null!`);
					value = value[pathNode];
				}
			}
			// at end of path, there must exist a valid UUID
			Assert(value != null && typeof value == "string" && Validate("UUID", value) == null, `Could not find valid UUID at rls-target field-path: ${pathInfo.fieldPath.join(".")}`);
			rlsTargets[pathInfo.table]!.push(value);
		}

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
			rlsTargets,
		}));
	}
};