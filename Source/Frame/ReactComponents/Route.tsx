import {BaseComponent} from "../UI/ReactGlobals";
import {URL} from "../General/URLs";
import {Fragment} from "redux-little-router";

export default class Route extends BaseComponent<{path?: string, withConditions?: Function}, {}> {
	render() {
		let {path, withConditions, children} = this.props;
		return (
			<Fragment withConditions={withConditions || (url=> {
				let urlStr = URL.FromState(url).Normalized().toString({domain: false, queryVars: false, hash: false});
				//return url.startsWith(targetURL);
				return urlStr.startsWith(path);
			})}>
				{children}
			</Fragment>
		);
	}
}