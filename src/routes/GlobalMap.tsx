import {BaseComponent} from "../Frame/UI/ReactGlobals";
import {firebaseConnect} from "react-redux-firebase";

@firebaseConnect()
export default class GlobalMap extends BaseComponent<{}, {}> {
	render() {
		return (
			<div>
				GlobalMap
			</div>
		);
	}
}