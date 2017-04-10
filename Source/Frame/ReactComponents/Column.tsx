import {BaseComponent, ApplyBasicStyles} from "../UI/ReactGlobals";
import {E} from "../General/Globals_Free";

@ApplyBasicStyles
export default class Column extends BaseComponent<{style?} & React.HTMLProps<HTMLDivElement>, {}> {
	render() {
		let {style, ...rest} = this.props;
		return <div {...rest} style={E({display: "flex", flexDirection: "column"}, style)}/>
	}
}