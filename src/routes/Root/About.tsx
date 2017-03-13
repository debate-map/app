import {SubNavBarButton} from "../@Shared/SubNavbar";
import SubNavbar from "../@Shared/SubNavbar";
import {BaseComponent, BaseProps} from "../../Frame/UI/ReactGlobals";
import VReactMarkdown from "../../Frame/ReactComponents/VReactMarkdown";
var ScrollView = require("react-free-scrollbar").default;

let pageText = `
TODO
`;

export default class AboutUI extends BaseComponent<{} & BaseProps, {}> {
	render() {
		let {page, match} = this.props;
		return (
			<VReactMarkdown className="selectable" source={pageText}
				containerProps={{
					style: {
						width: 960, margin: "100px auto", padding: "20px 50px", background: "rgba(0,0,0,.75)", borderRadius: 10,
					}
				}}
				renderers={{
					Text: props=> {
						return <span style={{color: "rgba(255,255,255,.7)"}}>{props.literal}</span>;
					}
				}}
			/>
		);
	}
}