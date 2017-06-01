import {BaseComponent} from "../UI/ReactGlobals";

export default class Switch extends BaseComponent<{}, {}> {
	render() {
		let {children} = this.props;
		let firstChild = (children as Array<any>).FirstOrX(a=>!!a);
		return firstChild;
	}
}