import {VReactMarkdown, PageContainer} from "web-vcore";
import {slackInviteLink} from "UI/More/Links.js";
import {observer_mgl} from "mobx-graphlink";
import React from "react";

const pageText = `
This project started as a personal goal of mine (Stephen Wicklund, aka "Venryx") around 2013. The main thing prompting it was frustration with how difficult
it seemed to be for people to efficiently explain and debate their views, once the conversation had expanded beyond a few basic points.

Plain text would work fine as the conversation started, but as it continued, the many threads could become very hard to follow; enough so that even
	topics both sides cared about deeply would often end in abandonment -- or continue, but with tangible frustration and/or major points getting dropped.

Those involved could still make progress, but it was far from ideal. The underlying limitation (at least the main one) seems to be that plain text
	can only extend in one dimension -- which makes it impossible to create branching without requiring substantial gaps between the thread entries.

I worked on a couple variations of the idea for a few years, but had not yet done much networking. I eventually came across a few people that seemed to have a very similar goal as mine, most notably Timothy High.
We got in contact with each other, and after some months (during which time new members joined), we eventually formed a group, called the "Canonical Debate Lab'.
* Slack (project chat): [Invite link](${slackInviteLink})
* Github organization: [https://github.com/canonical-debate-lab](https://github.com/canonical-debate-lab) (the GitHub organization for debate-map itself can be seen [here](https://github.com/debate-map))

Since then, I've been continuing to develop my implementation, while conversing with the group to help design a shared "tier-1 service layer" that each of our implementations can use for the cross-site data, eg. the public claims and arguments.

On a personal level, I've become very passionate about the project, and I plan to spend thousands of hours on it over the years, as I believe it could have a substantial impact on the way we do discourse.

There are *many* features and outreach ideas that I have planned; a small number of these can be seen on the [feedback page](/feedback).

Anyway, I hope all of you reading this are interested in it as well! It will need a healthy community to expand and become relevant/useful to the general public;
I'm confident that it will someday become an invaluable tool for bringing clarity and efficiency to online discussions, so I'll do my best to faithfully work on it until then.
`;

export const AboutUI = observer_mgl(()=>{
	return (
		<PageContainer scrollable={true}>
			<article>
				<VReactMarkdown source={pageText} containerProps={{className: "selectable"}} />
			</article>
		</PageContainer>
	);
})
