import {SubNavBarButton} from "../@Shared/SubNavBar";
import SubNavBar from "../@Shared/SubNavBar";
import {BaseComponent, SimpleShouldUpdate} from "../../Frame/UI/ReactGlobals";
import VReactMarkdown from "../../Frame/ReactComponents/VReactMarkdown";
import {styles} from "../../Frame/UI/GlobalStyles";
import {E, GetUrlPath, GetUrlParts, ToAbsoluteUrl, JumpToHash} from "../../Frame/General/Globals_Free";
import ScrollView from "react-vscrollview";
import {GetPathNodes} from "../../Store/router";
import {PropTypes} from "react";

let pageText = `
The Debate Map project is an innovative new platform for presenting and analyzing beliefs (or "theses") and the arguments that support them.${""
} Its content is crowd-sourced (like Wikipedia), and the software is open-sourced (under MIT), promoting collaborative development and increased accountability.<sup>[1](#footnote1)</sup>

[#]:# "Here is an example debate map: [Shape of the earth](/debates/shape-of-the-earth)"

Here is an example debate map: (Debate maps are currently under development. For now, see the [global map](/global).)

As can be seen, the tree-like structure makes it easy to traverse the available evidence and reasoning on the topic: at each level, there is a "thesis" which makes a claim, and a set of simple "arguments" which support it. By keeping the form of these arguments simple, we're able to match them (in many cases) with the basic forms of logical arguments (modus ponens, etc.), removing them from consideration to then focus solely on the chain of evidence.

This has the potential to...

## Transform discussion on contentious issues

Instead of the traditional thread-based dialogue (which tends toward long and hard-to-follow threads), or the brief but less thorough exchanges of in-person speech, this project aims to bring the benefits of both:
* Providing thoroughness and clarity-of-meaning by allowing arbitrarily deep subtrees. (each "supporting" or "opposing" its parent)
* Remaining traversable and easy to follow by having arguments mapped directly under the thesis they relate to, instead of sprawled out over many posts.
* Not re-inventing the wheel: populating a line of evidence or reasoning once, and then sharing it in every part of the tree (and in every conversation) where it's relevant.

The end result is a relatively clear and compact tree where, if a pair of members disagree, they simply take turns "adding layers" -- having the software display where their belief trees differ, and each marking within the tree the paths/subtrees they see most strongly supporting their view. (and thus opposing the other's)

At some point it will occur that either:
1) One of them realizes that the arguments supporting his original position (or a sub-position) is weaker than a competitor's, and changes his views accordingly. (ideal!)
2) One of them becomes forced to claim belief in a thesis which is admitted to have weaker mapped/presented arguments than a competitor.
3) They'll disagree on something difficult to collaboratively break down, such as claims of personal experiences. (since only one person has direct access to the memories)
4) They'll get so deep down in the belief tree that even if in theory the approach could work, it becomes too time-consuming to further develop the many branches.

While the less desirable options are sure to occur (and more often than we'd like), we still believe that the "recursive unrolling of belief trees" is substantially clearer, less error-prone, less emotionally-heating, and more conducive to abstraction/reuse and statisticical analysis than the options previously available.

## Expedite and modernize the detailed sharing of one's worldview

By acting as a global, flexible, and crowd-sourced tree of theses, communicating your view of the world becomes much faster. Instead of writing instance-specific text for each conversation, you can map your views once, and simply form a "remix" of your personal belief tree that is tailored for the conversation at hand.

The conversation can then proceed from that point, with the reasoning behind your views now known and easily referencable in the background.

## Facilitate more careful examination of one's own belief system

Engaging with a tool that operates on percentages, numbers, and weights makes self-accountability easier to achieve: by entering numbers, one is declaring to himself how much he considers his beliefs to be supported, and by what means. This allows one to then do tool-based analysis on his views, and more easily spot areas of possible bias or unjustified conclusions.

He can then proceed to look more closely at those areas, examining the pool of existing evidence and reasoning, and referencing statistics on how the rest of the population considers each piece along the way.

<a name="footnote1">1</a>: In case the project management falters or becomes biased, it's in the power of users to create their own copy of the project, and to modify it as they see fit.

More info on open-source projects: <https://opensource.com/resources/what-open-source>  
This project's GitHub repo (source code): <https://github.com/Venryx/DebateMap>
`;

@SimpleShouldUpdate
export default class HomeUI2 extends BaseComponent<{}, {}> {
	static contextTypes = {
		router: PropTypes.shape({
			history: PropTypes.shape({
				push: PropTypes.func.isRequired,
				replace: PropTypes.func.isRequired,
				createHref: PropTypes.func.isRequired
			}).isRequired
		}).isRequired
	};
	render() {
		let {page, match} = this.props;
		let {router} = this.context;
		return (
			<VReactMarkdown className="selectable Markdown" source={pageText}
				containerProps={{style: E(styles.page)}}
				renderers={{
					/*Text: props=> {
						return <span style={{color: "rgba(255,255,255,.7)"}}>{props.literal}</span>;
					},*/
					Link: props=> {
						let {href, nodeKey, children, literal, ...rest} = props;
						return (
							<a {...rest} href={href} key={nodeKey} onClick={e=> {
								//let fullURL = href.contains("://") ? href : GetUrlParts()[0] + "/" + href;
								let fullURL = ToAbsoluteUrl(href);
								let toURLParts = GetUrlParts(fullURL);
								let currentURLParts = GetUrlParts();
								if (toURLParts[0] == currentURLParts[0]) { // if domain names same
									e.preventDefault();

									if (href.startsWith("#")) {
										JumpToHash(href.substr(1));
										//document.getElementById(h).scrollIntoView();   //Even IE6 supports this
										return;
									}

									//let history = State().router.history;
									let history = router.history;
									if (toURLParts[1] == currentURLParts[1]) // if paths same
										history.replace(href);
									else
										history.push(href);
								}
							}}>
								{children}
							</a>
						);
					}
				}}
			/>
		);
	}
}