import {BaseComponent, BasicStyles} from "../UI/ReactGlobals";
import {E} from "../General/Globals_Free";

export default class Column extends BaseComponent<{style?}, {}> {
	render() {
		let {style, ...rest} = this.props;
		return <div {...rest} style={E({display: "flex", flexDirection: "column"}, BasicStyles(this.props), style)}/>
	}
}