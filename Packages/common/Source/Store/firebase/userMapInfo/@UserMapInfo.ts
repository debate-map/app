import {ObservableMap} from "web-vcore/nm/mobx";

export type UserMapInfoSet = {
	_key: string;
	maps: ObservableMap<string, UserMapInfo>;
};

export class UserMapInfo {
	_key: string;
	layerStates: LayerStatesMap;
}
export type LayerStatesMap = ObservableMap<string, boolean>;