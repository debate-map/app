import {BaseComponent} from "react-vextensions";
import {VURL} from "js-vextensions";
import {Fragment} from "redux-little-router";
import {NormalizeURL} from "../General/URLs";

export default class Route extends BaseComponent<{path?: string, withConditions?: Function}, {}> {
	render() {
		let {path, withConditions, children} = this.props;
		return (
			<Fragment
					parentRoute="routeWhichNeverMatches" matchWildcardRoute={()=>true} // fixes that "/global/map/philosophy.3" was not considered to match any of the route-patterns
					withConditions={withConditions || (url=> {
						let urlStr = NormalizeURL(VURL.FromState(url)).toString({domain: false, queryVars: false, hash: false});
						//return url.startsWith(targetURL);
						return urlStr.startsWith(path);
					})}>
				{children}
			</Fragment>
		);
	}
}