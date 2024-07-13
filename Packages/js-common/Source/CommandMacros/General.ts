import {Assert, emptyArray} from "js-vextensions";
import {Command, DBHelper, dbp, GenerateUUID, Validate} from "mobx-graphlink";
import {GetCommandRuns} from "../DB/commandRuns.js";
import {CommandRun} from "../DB/commandRuns/@CommandRun.js";
import {GetDBReadOnlyMessage, IsDBReadOnly} from "../DB/globalData.js";
import {GetUserHidden} from "../DB/userHiddens.js";
import {DMCommon_InServer} from "../Utils/General/General.js";
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

	// use defineProperty below, so the "_commandRuns" field is non-enumerable (so it doesn't show in logs/stringifications of `command`)
	if (DMCommon_InServer()) {
		// todo: change this to only find command-runs that are older than X days (eg. 3)
		//command["_commandRuns"] = GetCommandRuns(undefined, undefined, true);
		Object.defineProperty(command, "_commandRuns", {configurable: true, value: GetCommandRuns(undefined, undefined, true)});
	} else {
		//command["_commandRuns"] = emptyArray;
		Object.defineProperty(command, "_commandRuns", {configurable: true, value: emptyArray});
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
	// some commands (eg. DeleteNode) need contraint-deferring till end of transaction, so just do that always (instant-checking doesn't really improve debugging in this context anyway)
	db.DeferConstraints = true;

	/*const commandClass = command.constructor as typeof Command;
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

		// keep command-runs collection from growing beyond X entries (this implementation isn't great, but better than nothing for now)
		const commandRunsToRemove = (command["_commandRuns"] as CommandRun[]).OrderByDescending(a=>a.runTime).filter((commandRun, index)=>{
			// keep the most recent 100 entries
			if (index < 100) return false;
			// keep entries created in the last 3 days
			const timeSinceRun = Date.now() - commandRun.runTime;
			if (timeSinceRun < 3 * 24 * 60 * 60 * 1000) return false;
			// delete the rest
			return true;
		}).Take(10); // limit command-runs-to-remove to 10 entries (else server can be overwhelmed and crash; exact diagnosis unknown, but happened for case of 227-at-once)
		for (const commandRun of commandRunsToRemove) {
			db.set(dbp`commandRuns/${commandRun.id}`, null);
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
			commandInput: command.payload_orig,
			commandResult: command.returnData,
			rlsTargets,
		}));
	}*/
};