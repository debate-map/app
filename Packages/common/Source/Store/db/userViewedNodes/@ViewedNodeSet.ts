import {ObservableMap} from "web-vcore/nm/mobx.js";

export type ViewedNodeSet = ObservableMap<string, boolean>;
// AddSchema({patternProperties: {[User_id]: {type: "boolean"}}}, "ViewedNodeSet");