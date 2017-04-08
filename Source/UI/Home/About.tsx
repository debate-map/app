import {SubNavBarButton} from "../@Shared/SubNavBar";
import SubNavBar from "../@Shared/SubNavBar";
import {BaseComponent, SimpleShouldUpdate} from "../../Frame/UI/ReactGlobals";
import VReactMarkdown from "../../Frame/ReactComponents/VReactMarkdown";
import ScrollView from "react-vscrollview";
import {styles} from "../../Frame/UI/GlobalStyles";

let pageText = `
This project started as a personal goal of mine (Stephen Wicklund, aka Venryx) around 2013. The main thing prompting it was frustration with how difficult
it seemed to be for people to efficiently explain and debate their views, once the conversation had expanded beyond a few basic points.

Plain text would work fine as a pair started out:
* Person A would express a position, and a basic argument.
* Person B would make his response -- tied in with his own initial statement.
* Person A would then defend his points, while also responding to the points just made by person B.
* Person B would point out an invalid inference in person A's latest post, while tying that in rhetorically with some further elaboration of his initial argument.

In the best of cases, this process would occur linearly or with a slight narrowing of scope, and would eventually wrap up with both sides having learned something.
In the worst of cases, the posts would increase in size by 50% or more each generation, leading it to very quickly
	become unmanageable -- causing abandonment, frustration, or for major points to start being silently dropped.
In the majority of cases, the posts would increase in size, but at a more modest rate, and with attempts from both sides to cut down the noise and focus on the main disagreements.

This could work, but it was far from ideal -- one basic reason being that, as the conversation continued, it became increasingly
	difficult to remember how the latest points related to the original topic, and which ones were even worth pursuing further.
The fundamental limitation on this point is that plain text can only extend in one dimension, making it impossible to create branching
	without requiring ever-increasing gaps between the thread entries.

The simple answer seemed to be to use a two-dimensional system, with responses trimmed down into single sentences, supporting or opposing some statement made before.
The design for this took a few days to put together (particularly, with how to best prevent partiality, as perception of bias
	can greatly reduce the impact of a website of this sort), but I formed a basic design and then began the development process.
It was originally built using PHP, HTML, and jQuery, and it worked fine as far as it was taken; however, it was lacking a number of features that would really make it useful,
and it had some performance limitations that I knew would cause problems if it started getting substantial traffic.

Despite this, I was happy with the results. It was a nice "proof of concept", and even in its infant form, it had already proven helpful for
	combing through the various topics I had done reading on in the months before.
I let it sit for a while, then let it fall into disrepair eventually, as I shifted my focus back onto other concerns and projects -- game development being one of them.
I decided eventually that I would wait to fully "launch" the website till I'd gained more development experience, and, preferably, had a source of income.

Anyway, long story short, I eventually suspended that plan, and came back to this after various changes:
* My brother was having health issues which detracted from my game development process.
* The election (and the many things around it) reignited my interest in discussion and debate.
* I had gained significant experience in UI design, code infrastructure, and web-development setup. (Webpack, TypeScript, VSCode, etc.)
* I had become familiar with various UI frameworks which I believed would make development much easier. (the most important being React and Redux)

I got to work over the next few weeks, designing as I went, and the result is what you see today!

The state it's in now is fairly basic, but it has a good foundation and achieves its basic function.
There are many things that can be built on top of this now, which I believe will increase its usefulness a lot.
	
For example:
* The "belief tree comparison" feature mentioned on the home-page, helping people instantly hone in on their points of disagreement with any other debate-mapper.
* Whole-tree probability-flow analysis, for detecting areas where a member's views may be inconsistent with their answers somewhere else. (or greatly divergent from their peers, without apparent cause)
* Social features organizing communal mapping of external media and resources. Similar to fact-checking websites, except "by the people", and more open-ended and in much finer detail.
* Expanded tagging, voting, statistical analysis, and group/camp/cohort categorization (with ui filtering).
* Forums tightly integrated with debate-mapping tools, combining the appeal of open-ended writing with the clarity that's achived through mapping it.

There's much more -- and it's all firmly doable! (well, other than the whole-tree probability analysis, maybe) It's just a matter of investing the development time, and progressing carefully enough so as not to dilute the existing core.

This is a major project for me, and I plan to spend thousands of hours on it over the years, as I believe it could have a substantial impact on the way we do discourse.
While I don't know when or where exactly this time will be invested, (for example, I might disappear for months at a time to work on other things for a period),
I'll definitely continue to come back to this.

I hope all of you reading this are interested in it as well, as it obviously needs a rich community to actually take off and become relevant/useful.
A few years down the road (especially if we can get together a solid development team!), we could have something really great to bring to the discussion table.
`;

@SimpleShouldUpdate
export default class AboutUI extends BaseComponent<{}, {}> {
	render() {
		let {page, match} = this.props;
		return (
			<VReactMarkdown className="selectable" source={pageText}
				containerProps={{style: styles.page}}
				renderers={{
					Text: props=> {
						return <span style={{color: "rgba(255,255,255,.7)"}}>{props.literal}</span>;
					}
				}}
			/>
		);
	}
}