import {ObservableMap} from "mobx";

export type ViewedNodeSet = ObservableMap<string, boolean>;
// AddSchema({patternProperties: {[User_id]: {type: "boolean"}}}, "ViewedNodeSet");