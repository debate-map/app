import {BaseComponent} from "react-vextensions";
import { Connect } from "../../Frame/Database/FirebaseConnect";
import {VURL} from "js-vextensions";
import { push, replace } from "redux-little-router";
import { DoesURLChangeCountAsPageChange } from "Frame/Store/ActionProcessor";
import {GetCurrentURL} from "../../Frame/General/URLs";
import {GetNewURL} from "Frame/URL/URLManager";
import {loadingURL} from "../../Frame/URL/URLManager";

let lastURL: VURL;

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
		//g.justChangedURLFromCode = true;
		action.payload.byCode = true;
		store.dispatch(action);
		return <div/>;
	}
}