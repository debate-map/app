import {Command} from "web-vcore/nm/mobx-graphlink.js";

//type CommandRunMetadata_ConstructorData = Partial<CommandRunMetadata>;
type CommandRunMetadata_ConstructorData = RequiredBy<Partial<CommandRunMetadata>, "record">;

export function CommandRunMeta(data: CommandRunMetadata_ConstructorData) {
	function ApplyToClass(targetClass: typeof Command) {
		const metadata = new CommandRunMetadata(data);
		CommandRunMetadata.entries.set(targetClass, metadata);
	}
	return ApplyToClass;
}

export function GetCommandRunMetaForClass(commandClass: typeof Command) {
	return CommandRunMetadata.entries.get(commandClass);
}

export class CommandRunMetadata {
	static entries = new Map<typeof Command, CommandRunMetadata>();

	constructor(data: CommandRunMetadata_ConstructorData) {
		Object.assign(this, data);
	}

	record: boolean;
	/** If true, recording will only occur if there is no ancestor command which is already going to get added to the stream (ie. recorded, with public_base:true). */
	record_cancelIfAncestorCanBeInStream = false;
	canShowInStream = false;
	/** This only needs to be specified if canShowInStream is true. (when that field is false, no one but admins can access anyway, for whom the rls-target-paths array has no effect) */
	rlsTargetPaths = [] as RLSTargetPath[];
}

export type RLSFieldPath_0 = "payload" | "returnData";
export class RLSTargetPath {
	table: "nodes";
	fieldPath: [RLSFieldPath_0, ...string[]];
}