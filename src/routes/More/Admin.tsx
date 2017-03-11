import {BaseComponent} from "../../Frame/UI/ReactGlobals";
import {firebaseConnect} from "react-redux-firebase";

@firebaseConnect()
export default class AdminUI extends BaseComponent<{}, {}> {
	render() {
		return (
			<div>
				AdminUI
			</div>
		);
	}
}