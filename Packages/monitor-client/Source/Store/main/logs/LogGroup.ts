import {LogEntry} from "UI/Logs/Realtime";
import {FieldMatchesStr, FieldMatchesValInList} from "../database/MtxGroup";

export class LogGroup {
	enabled = true;

	constraints: LogConstraint[] = [];
	filter = false;
	highlight = false;
	highlightColor = "rgba(0,255,0,.2)";

	// use static functions, so the instances can be json stringified->parsed without re-attaching prototypes
	static Matches(self: LogGroup, entry: LogEntry) {
		return self.constraints.filter(a=>a.enabled).All(constraint=>LogConstraint.Matches(constraint, entry));
	}
}
export class LogConstraint {
	enabled = true;

	level_matchEnabled = false;
	level_matchVals = [] as string[];
	target_matchEnabled = false;
	target_matchStr = "";
	spanName_matchEnabled = false;
	spanName_matchStr = "";
	message_matchEnabled = false;
	message_matchStr = "";

	static Matches(self: LogConstraint, entry: LogEntry) {
		if (self.level_matchEnabled && !FieldMatchesValInList(entry.level, self.level_matchVals)) return false;
		if (self.target_matchEnabled && !FieldMatchesStr(entry.target, self.target_matchStr)) return false;
		if (self.spanName_matchEnabled && !FieldMatchesStr(entry.spanName, self.spanName_matchStr)) return false;
		if (self.message_matchEnabled && !FieldMatchesStr(entry.message, self.message_matchStr)) return false;
		return true;
	}
}