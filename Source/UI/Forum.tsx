import {ForumUI as ForumUI_Base} from "firebase-forum";
import {Connect} from "Frame/Database/FirebaseConnect";
import {BaseComponent} from "react-vextensions";

@Connect(state=> ({
}))
export default class ForumUI extends BaseComponent<{}, {}> {
	render() {
		return (
			<ForumUI_Base/>
		);
	}
}