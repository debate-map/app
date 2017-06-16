import {BaseComponent} from "../../Frame/UI/ReactGlobals";
import { Connect } from "../../Frame/Database/FirebaseConnect";
import { GetNewURL, loadingURL } from "Frame/URL/URLManager";
import { push, replace } from "redux-little-router";
import { DoesURLChangeCountAsPageChange } from "Frame/Store/ActionProcessor";
import {URL} from "../../Frame/General/URLs";

let lastURL: URL;

type Props = {} & Partial<{newURL: string, pushURL: boolean}>;
@Connect((state, {}: Props)=> {
	let newURL = GetNewURL();
	//Log("Got new url:" + newURL);
	let pushURL = !loadingURL && DoesURLChangeCountAsPageChange(lastURL, newURL, false);
	//if (pushURL) Log(`Pushing: ${newURL} @oldURL:${lastURL}`);
	lastURL = newURL;
	return {newURL: newURL.toString(), pushURL};
})
export default class AddressBarWrapper extends BaseComponent<Props, {}> {
	render() {
		let {newURL, pushURL} = this.props;
		let action = pushURL ? push(newURL) : replace(newURL);
		//action.byUser = false;
		g.justChangedURLFromCode = true;
		store.dispatch(action);
		return <div/>;
	}
}