import {Column, Switch} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {ProposalsUI} from "UI/Feedback/ProposalsUI.js";
import {store} from "Store";
import {SubNavBar, SubNavBarButton} from "./@Shared/SubNavBar.js";

export class FeedbackUI extends BaseComponentPlus({} as {}, {}) {
	render() {
		/* if (true) {
			return (
				<PageContainer scrollable={true}>
					<article>
						<VReactMarkdown source={'Feedback page is temporarily disabled for maintenance.'} className='selectable'/>
					</article>
				</PageContainer>
			);
		} */
		const currentSubpage = store.main.feedback.subpage;
		const page = "feedback";
		return (
			<>
				<SubNavBar>
					<SubNavBarButton page={page} subpage="proposals" text="Proposals" /*actionFuncIfAlreadyActive={s=>s.feedback.main.proposals.selectedProposalID = null}*//>
					{/* <SubNavBarButton page={page} subpage="roadmap" text="Roadmap"/>
					<SubNavBarButton page={page} subpage="neutrality" text="Neutrality"/> */}
				</SubNavBar>
				<Switch>
					<ProposalsUI/>
					{/* currentSubpage == "roadmap" && <RoadmapUI/>}
					{currentSubpage == "neutrality" && <NeutralityUI/> */}
				</Switch>
			</>
		);
	}
}