import {ObservableMap} from "mobx";

export type ViewerSet = ObservableMap<string, boolean>;
// AddSchema({patternProperties: {[User_id]: {type: "boolean"}}}, "ViewerSet");