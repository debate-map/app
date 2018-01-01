import {Component} from "react" // eslint-disable-line
import {BaseComponent, BaseProps} from "react-vextensions";
//import {Component as BaseComponent} from "react-vextensions";
import VReactMarkdown from "../Frame/ReactComponents/VReactMarkdown";
import SubNavBar from "./@Shared/SubNavBar";
import {SubNavBarButton} from "./@Shared/SubNavBar";
import HomeUI2 from "./Home/Home";
import AboutUI from "./Home/About";
import ScrollView from "react-vscrollview";
import {Column} from "react-vcomponents";
import {Switch} from "react-vcomponents";
import {Connect} from "../Frame/Database/FirebaseConnect";

type Props = {} & Partial<{currentSubpage: string}>;
@Connect(state=> ({
	currentSubpage: State(a=>a.main.home.subpage),
}))
export default class HomeUI extends BaseComponent<Props, {}> {
	render() {
		let {currentSubpage} = this.props;
		let page = "home";
		return (
			<Column style={{flex: 1}}>
				<SubNavBar>
					<SubNavBarButton {...{page}} subpage="home" text="Home"/>
					<SubNavBarButton {...{page}} subpage="about" text="About"/>
				</SubNavBar>
				<ScrollView id="HomeScrollView" style={{flex: 1}} scrollVBarStyle={{width: 10}}>
					<Switch>
						<HomeUI2/>
						{currentSubpage == "about" && <AboutUI/>}
					</Switch>
				</ScrollView>
			</Column>
		);
	}
}