import {SubNavBarButton} from "../@Shared/SubNavBar";
import SubNavBar from "../@Shared/SubNavBar";
import {BaseComponent, SimpleShouldUpdate} from "react-vextensions";
import VReactMarkdown from "../../Frame/ReactComponents/VReactMarkdown";
import {ScrollView} from "react-vscrollview";
import {styles} from "../../Frame/UI/GlobalStyles";

let pageText = `
This project started as a personal goal of mine (Stephen Wicklund, aka "Venryx") around 2013. The main thing prompting it was frustration with how difficult
it seemed to be for people to efficiently explain and debate their views, once the conversation had expanded beyond a few basic points.

Plain text would work fine as the conversation started, but as it continued, the many threads could become very hard to follow; enough so that even
	topics both sides cared about deeply would often end in abandonment -- or continue, but with tangible frustration and/or major points getting dropped.

Those involved could still make progress, but it was far from ideal. The underlying limitation (at least the main one) seems to be that plain text
	can only extend in one dimension -- which makes it impossible to create branching without requiring substantial gaps between the thread entries.

The simple answer seemed to be to use a two-dimensional system, with responses trimmed down into single sentences, supporting or opposing each statement made before.
The first attempt at a design for this took a few days to put together (particularly, with how to best prevent partiality, as perception of bias
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
* I had become familiar with various frameworks which I believed would make development much easier. (the most important being React and Redux)

I got to work over the next few weeks, designing as I went, and the result is what you see today!

The state it's in now is fairly basic, but it has a good foundation I think, and achieves its basic function.
There are many things that can be built on top of this now, which I think will increase its usefulness a lot.
	
For example:
* The "belief tree comparison" feature mentioned on the home-page, helping people instantly hone in on their points of disagreement with any other debate-mapper.
* Whole-tree probability-flow analysis, for detecting areas where a member's views may be inconsistent with their answers somewhere else.
	(or greatly divergent from their peers, without apparent cause)
* Social features organizing communal mapping of external media and resources. Similar to fact-checking websites, except "by the people",
	and more open-ended and in much finer detail.
* Expanded tagging, rating, statistical analysis, and group/camp/cohort categorization (with UI filtering).
* Forums tightly integrated with the debate-mapping tools, combining the appeal of open-ended writing with the clarity that's achieved through mapping it.

There's much more -- and it's all firmly doable! (well, other than the whole-tree probability analysis, maybe) It's just a matter of investing
	the development time, and progressing carefully enough so as not to dilute the existing core.

On a personal level, I've become very passionate about this project, and I plan to spend thousands of hours on it over the years, as I believe it could have a substantial impact on the way we do discourse.
While I don't know when or where exactly this time will be invested (for example, I might disappear for months at a time to work on other things for a period),
I'll definitely continue to come back to this.

I hope all of you reading this are interested in it as well, as it obviously needs a healthy community to actually take off and become relevant/useful.
A few years down the road (especially if we can get together a good development team!), we could have something really great to bring to discussions.
`;

@SimpleShouldUpdate
export default class AboutUI extends BaseComponent<{}, {}> {
	render() {
		let {page, match} = this.props;
		return (
			<article>
				<VReactMarkdown className="selectable" style={styles.page} source={pageText}
					/*markdownOptions={{breaks: false}} rendererOptions={{breaks: false}}
					rendererOptions={{
						components: {
							br: ()=><span> </span>
						}
					}}*/
					/*renderers={{
						Text: props=> {
							return <span style={{color: "rgba(255,255,255,.7)"}}>{props.literal}</span>;
						}
					}}*/
				/>
			</article>
		);
	}
}