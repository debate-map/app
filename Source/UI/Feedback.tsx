import {Column, Switch} from "react-vcomponents";
import {BaseComponent, BaseComponentPlus} from "react-vextensions";
import {ProposalsUI} from "UI/Feedback/ProposalsUI";
import {store} from "Store";
import {PageContainer, VReactMarkdown} from "vwebapp-framework/Source";
import {SubNavBar, SubNavBarButton} from "./@Shared/SubNavBar";

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
					<SubNavBarButton page={page} subpage="proposals" text="Proposals" actionFuncIfAlreadyActive={s=>s.feedback.main.proposals.selectedProposalID = null}/>
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