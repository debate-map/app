import {Component} from "react" // eslint-disable-line
import {BaseComponent, BaseProps} from "react-vextensions";
//import {Component as BaseComponent} from "react-vextensions";
import VReactMarkdown from "../Frame/ReactComponents/VReactMarkdown";
import SubNavBar from "./@Shared/SubNavBar";
import {SubNavBarButton} from "./@Shared/SubNavBar";
import HomeUI2 from "./Home/Home";
import AboutUI from "./Home/About";
import ScrollView from "react-vscrollview";
import TermsUI from "./Content/TermsUI";
import ImagesUI from "./Content/ImagesUI";
import {Connect} from "../Frame/Database/FirebaseConnect";
import {Switch} from "react-vcomponents";

type Props = {} & Partial<{currentSubpage: string}>;
@Connect(state=> ({
	currentSubpage: State(a=>a.main.content.subpage),
}))
export default class ContentUI extends BaseComponent<Props, {}> {
	render() {
		let {currentSubpage} = this.props;
		let page = "content";
		return (
			<div style={{flex: 1, display: "flex", flexDirection: "column"}}>
				<SubNavBar>
					<SubNavBarButton {...{page}} subpage="terms" text="Terms"/>
					<SubNavBarButton {...{page}} subpage="images" text="Images"/>
				</SubNavBar>
				<Switch>
					{currentSubpage == "images" && <ImagesUI/>}
					<TermsUI/>
				</Switch>
			</div>
		);
	}
}