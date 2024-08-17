import {Column, Switch} from "react-vcomponents";
import {BaseComponent, BaseComponentPlus} from "react-vextensions";
import {store} from "Store";
import {Observer, PageContainer, SubNavBar, SubNavBarButton, VReactMarkdown} from "web-vcore";
import React from "react";

@Observer
export class FeedbackUI extends BaseComponentPlus({} as {}, {}) {
	render() {
		const currentSubpage = store.main.feedback.subpage;
		const page = "feedback";
		return (
			<>
				<SubNavBar>
					<SubNavBarButton page={page} subpage="new" text="New" /*actionFuncIfAlreadyActive={s=>s.feedback.main.proposals.selectedProposalID = null}*//>
					{/*<SubNavBarButton page={page} subpage="roadmap" text="Roadmap"/>
					<SubNavBarButton page={page} subpage="neutrality" text="Neutrality"/>*/}
				</SubNavBar>
				<Switch>
					<ProposalsUI_Stub/>
					{/*currentSubpage == "roadmap" && <RoadmapUI/>}
					{currentSubpage == "neutrality" && <NeutralityUI/>*/}
				</Switch>
			</>
		);
	}
}

class ProposalsUI_Stub extends BaseComponent<{}, {}> {
	render() {
		return (
			<PageContainer scrollable={true}>
				<article>
					<VReactMarkdown source={source} className="selectable"/>
				</article>
			</PageContainer>
		);
	}
}

const source = `
The tracking of proposals and tasks is currently managed on the Debate Map's GitHub repo.
* Structured view: [https://github.com/orgs/debate-map/projects/1](https://github.com/orgs/debate-map/projects/1)
* Flat-list view: [https://github.com/debate-map/app/issues](https://github.com/debate-map/app/issues)

To see the old task-tracking system, visit the "Old" subpage linked above. (in the long-term, the two systems will be merged)
`.AsMultiline(0);