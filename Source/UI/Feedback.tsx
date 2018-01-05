import {Component} from "react" // eslint-disable-line
import {BaseComponent, BaseProps} from "react-vextensions";
//import {Component as BaseComponent} from "react-vextensions";
import VReactMarkdown from "../Frame/ReactComponents/VReactMarkdown";
import SubNavBar from "./@Shared/SubNavBar";
import {SubNavBarButton} from "./@Shared/SubNavBar";
import HomeUI2 from "./Home/Home";
import AboutUI from "./Home/About";
import {ScrollView} from "react-vscrollview";
import TermsUI from "./Content/TermsUI";
import ImagesUI from "./Content/ImagesUI";
import {Connect} from "../Frame/Database/FirebaseConnect";
import {Switch} from "react-vcomponents";
import UsersUI from "./Users";
import { ProposalsUI } from "UI/Feedback/ProposalsUI";

type Props = {} & Partial<{currentSubpage: string}>;
@Connect(state=> ({
	currentSubpage: State(a=>a.main.feedback.subpage),
}))
export class FeedbackUI extends BaseComponent<Props, {}> {
	render() {
		let {currentSubpage} = this.props;
		let page = "feedback";
		return (
			<div style={{flex: 1, display: "flex", flexDirection: "column"}}>
				<SubNavBar>
					<SubNavBarButton {...{page}} subpage="proposals" text="Proposals"/>
					<SubNavBarButton {...{page}} subpage="roadmap" text="Roadmap"/>
					<SubNavBarButton {...{page}} subpage="neutrality" text="Neutrality"/>
				</SubNavBar>
				<Switch>
					<ProposalsUI/>
					{/*currentSubpage == "roadmap" && <RoadmapUI/>}
					{currentSubpage == "neutrality" && <NeutralityUI/>*/}
				</Switch>
			</div>
		);
	}
}