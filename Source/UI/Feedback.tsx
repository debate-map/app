import { ProposalsUI } from "UI/Feedback/ProposalsUI";
import { Switch } from "react-vcomponents";
import { BaseComponent } from "react-vextensions";
import { Connect } from "../Frame/Database/FirebaseConnect";
import SubNavBar, { SubNavBarButton } from "./@Shared/SubNavBar";

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
					{/*<SubNavBarButton {...{page}} subpage="roadmap" text="Roadmap"/>
					<SubNavBarButton {...{page}} subpage="neutrality" text="Neutrality"/>*/}
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