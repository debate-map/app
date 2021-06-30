import {ObservableMap} from "web-vcore/nm/mobx.js";

export type ViewerSet = ObservableMap<string, boolean>;
// AddSchema({patternProperties: {[User_id]: {type: "boolean"}}}, "ViewerSet");