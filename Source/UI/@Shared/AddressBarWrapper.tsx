import {BaseComponent} from "../../Frame/UI/ReactGlobals";
import { Connect } from "../../Frame/Database/FirebaseConnect";
import { GetNewURL, loadingURL } from "Frame/URL/URLManager";
import { push, replace } from "redux-little-router";
import { DoesURLChangeCountAsPageChange } from "Frame/Store/ActionProcessor";
import {URL, GetCurrentURL} from "../../Frame/General/URLs";

let lastURL: URL;

type Props = {} & Partial<{newURL: string, lastURL: string, pushURL: boolean}>;
@Connect((state, {}: Props)=> {
	let newURL = GetNewURL();
	let pushURL = !loadingURL && DoesURLChangeCountAsPageChange(lastURL, newURL, false);
	//if (pushURL) Log(`Pushing: ${newURL} @oldURL:${lastURL}`);

	var result = {newURL: newURL.toString({domain: false}), lastURL: lastURL ? lastURL.toString({domain: false}) : null, pushURL};
	lastURL = newURL;
	return result;
})
export default class AddressBarWrapper extends BaseComponent<Props, {}> {
	render() {
		let {newURL, lastURL, pushURL} = this.props;
		
		if (lastURL) {
			var action = pushURL ? push(newURL) : replace(newURL);
			MaybeLog(a=>a.urlLoads, ()=>`Dispatching new-url: ${newURL} @type:${action.type}`);
		} else {
			// if page just loaded, do one "start-up" LOCATION_CHANGED action, with whatever's in the address-bar
			let startURL = GetCurrentURL(true).toString({domain: false});
			var action = replace(startURL);
			MaybeLog(a=>a.urlLoads, ()=>`Dispatching start-url: ${GetCurrentURL(true)} @type:${action.type}`);
		}
		
		//action.byUser = false;
		g.justChangedURLFromCode = true;
		store.dispatch(action);
		return <div/>;
	}
}