import {Mtx, MtxSection} from "UI/DB/Requests";

export class MtxGroup {
	enabled = true;

	constraints: MtxConstraint[] = [];
	filter = false;
	highlight = false;
	highlightColor = "rgba(0,255,0,.2)";

	// use static functions, so the instances can be json stringified->parsed without re-attaching prototypes
	static Matches(self: MtxGroup, mtx: Mtx) {
		return self.constraints.filter(a=>a.enabled).All(constraint=>MtxConstraint.Matches(constraint, mtx));
	}
}
export class MtxConstraint {
	enabled = true;

	hasSectionMatching = new MtxSectionConstraint();

	static Matches(self: MtxConstraint, mtx: Mtx) {
		return mtx.sectionLifetimes.Any(section=>MtxSectionConstraint.Matches(self.hasSectionMatching, section));
	}
}
export class MtxSectionConstraint {
	constructor(data?: Partial<MtxSectionConstraint>) { Object.assign(this, data); }
	//enabled = false; // commented; this would have identical behavior as MtxConstraint.enabled (since MtxConstraint only has one content atm: an MtxSectionConstraint)

	path_matchEnabled = false;
	path_matchStr = "";
	extraInfo_matchEnabled = false;
	extraInfo_matchStr = "";

	static Matches(self: MtxSectionConstraint, section: MtxSection) {
		if (self.path_matchEnabled && !FieldMatchesStr(section.path, self.path_matchStr)) return false;
		if (self.extraInfo_matchEnabled && !FieldMatchesStr(section.extraInfo ?? "", self.extraInfo_matchStr)) return false;
		return true;
	}
}

export function FieldMatchesStr(fieldValue: string, matchStr: string) {
	if (matchStr.startsWith("/") && matchStr.endsWith("/")) {
		return fieldValue.match(new RegExp(matchStr.slice(1, -1))) != null;
	}
	return fieldValue.includes(matchStr);
}
export function FieldMatchesValInList(fieldValue: string, matchVals: string[]) {
	return matchVals.includes(fieldValue);
}