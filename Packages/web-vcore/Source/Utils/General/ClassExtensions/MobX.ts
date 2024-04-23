/*import {ObservableMap} from "mobx";

// provide special version of VValues() for ObservableMap (since the default one won't work)
declare module "mobx" {
	interface ObservableMap<K = any, V = any> {
		VValues(this: ObservableMap<K, V>, excludeSpecialProps?: boolean | 1): V[];
	}
}
export const specialProps = ["_", "_key", "_id"];
ObservableMap.prototype._AddFunction_Inline = function VValues(this: ObservableMap, excludeSpecialProps: boolean | 1 = false) {
	//if (excludeSpecialProps) return this.Props(true).map(a=>a.value);
	if (excludeSpecialProps) return Array.from(this.keys()).Except(specialProps).map(a=>this.get(a));
	return Array.from(this.keys()).map(a=>this.get(a));
};*/