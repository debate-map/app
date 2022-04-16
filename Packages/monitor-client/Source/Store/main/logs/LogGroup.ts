import {LogEntry} from "UI/Logs";
import {FieldMatchesStr} from "../database/MtxGroup";

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

	message_matchEnabled = false;
	message_matchStr = "";

	static Matches(self: LogConstraint, entry: LogEntry) {
		if (self.message_matchEnabled && !FieldMatchesStr(entry.message, self.message_matchStr)) return false;
		return true;
	}
}