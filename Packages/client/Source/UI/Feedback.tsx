import {Switch} from "react-vcomponents";
import {PageContainer, SubNavBar, SubNavBarButton, VReactMarkdown} from "web-vcore";
import React from "react";
import {observer_mgl} from "mobx-graphlink";

const source = `
The tracking of proposals and tasks is currently managed on the Debate Map's GitHub repo.
* Structured view: [https://github.com/orgs/debate-map/projects/1](https://github.com/orgs/debate-map/projects/1)
* Flat-list view: [https://github.com/debate-map/app/issues](https://github.com/debate-map/app/issues)

To see the old task-tracking system, visit the "Old" subpage linked above. (in the long-term, the two systems will be merged)
`.AsMultiline(0);

export const FeedbackUI = observer_mgl(()=>{
	const page = "feedback";
	return (
    	<>
    		<SubNavBar>
    			<SubNavBarButton page={page} subpage="new" text="New" />
    		</SubNavBar>
    		<Switch>
    			<ProposalsUI_Stub/>
    		</Switch>
    	</>
	);
});

const ProposalsUI_Stub = ()=>{
	return (
        <PageContainer scrollable>
            <article>
                <VReactMarkdown source={source} containerProps={{className: "selectable"}}/>
            </article>
        </PageContainer>
	);
};
