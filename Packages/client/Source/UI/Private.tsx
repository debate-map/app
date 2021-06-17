import {BaseComponentPlus} from "web-vcore/nm/react-vextensions";
import {MapType} from "dm_common";
import {MapListUI} from "./@Shared/Maps/MapListUI";

export class PrivateUI extends BaseComponentPlus({} as {}, {}) {
	render() {
		return <MapListUI type={MapType.Private}/>;
	}
}