import React from "react";
import {Link, PageContainer, List, P} from "web-vcore";
import {BaseComponent} from "web-vcore/nm/react-vextensions";

const red = "rgba(255,0,0,.7)";
const orange = "rgba(255,128,0,.7)";
const green = "rgba(0,255,0,.6)";

/*const Problem = (props: {text?: string})=><span style={{color: red}}>{props.text ?? "Problem:"}</span>;
const Solution = (props: {text?: string})=><span style={{color: green}}>{props.text ?? "Solution:"}</span>;*/
const ProblemCard = (props: {title: string, problem: string, solution: string})=>{
	const {title, problem, solution} = props;
	return (
		<>
			<h3>{title}</h3>
			<span style={{color: red}}>Problem: </span>
			<span>{problem}</span><br/>
			<span style={{color: green}}>Solution: </span>
			<span>{solution}</span>
		</>
	);
};

export class HomeUI2 extends BaseComponent<{}, {}> {
	render() {
		return (
			<PageContainer scrollable={true}>
				<article className="selectable">
					<P>The Debate Map project is a web platform aimed at improving the efficiency of discussion and debate.
					It's crowd-sourced and open-source, and welcomes reader contributions.</P>

					<P>Its primary improvements are (in short):
					<List items={[
						`Restructuring dialogue to make use of both dimensions.`,
						`Breaking down lines of reasoning into single-sentence "nodes".`,
						`Providing rich tools that operate on those nodes -- such as rating, tagging, statistical analysis, and belief-tree sharing and comparison.`,
					]}/></P>

					<P>Here are some demo maps:
					<List items={[
						<Link text="What shape is the earth?" to="/private/what-shape-is-the-earth-demo.1xSIqiEQR7u4Xn88Q9_t_g"/>
					]}/></P>

					<P>The maps are constructed from "claims" (blue), and "arguments" (green and red) which support/oppose those claims.
					This structure cuts down on reading time, and lets us focus on the underlying chains of reasoning instead of parsing statement meanings and connections.</P>

					<h2>Advantages</h2>

					<ProblemCard
						title={`Preserve response context`}
						problem={`On heated topics, debates often involve many points being made and responded to in each post.
							Because traditional dialogue is linear, this creates a large gap between each point and its responses.`}
						solution={`Make use of both dimensions: have points flow down, and responses flow to the right.
							Responses are now directly next to the points they're made against.`}/>

					<ProblemCard
						title={`Sort the arguments by strength`}
						problem={`Topics under debate can be large, with dozens of points to consider. Thread-based mediums give no help in finding the strongest ones, forcing you to skim through them all.`}
						solution={`Provide built-in voting on the strength of each point. Even if you don't agree with the general population, the strongest points will still rise near to the top.`}/>

					<ProblemCard
						title={`Reduce the power of rhetoric`}
						problem={`The perception of who "won" a debate often depends more on how skilled the debaters are, than how strongly their views are backed by evidence.`}
						solution={`Require points to be distilled to their simplest forms. "Weasel words", exhaggerations, and other noise become easier to spot and point out. (just add a response right next to it!)`}/>

					<ProblemCard
						title={`Don't reinvent the wheel`}
						problem={`Debates rage across the internet, with the same arguments being made hundreds, even thousands, of times. This means a lot of redundant thought and typing!`}
						solution={`Break down arguments into their constituent parts, and let each part be connected anywhere in the tree where relevant. Also, provide tools to easily merge duplicates.
							Now whenever a response or other change is made, it becomes visible throughout the tree, wherever the parent point is connected.`}/>

					<ProblemCard
						title={`Prevent burying of minority viewpoints`}
						problem={`Some viewpoints encounter sharp resistance whenever attempted to be argued for.
							This discourages new ideas from being presented -- and when they are presented, makes it harder for them to be heard,
							as they can be "buried" (or even blocked) by the more numerous majority.`}
						solution={`Provide a level playing ground, with equal space for both sides: supporting arguments go above the line, and opposing ones below.
							No matter how great the majority, the minority viewpoint maintains its position at the table, allowing its strongest points to be directly compared with those of its opposition.`}/>

					<ProblemCard
						title={`No time commitment`}
						problem={`Engaging in traditional debate can be tiring, because once you start, you're often pulled in and are required to invest hours to provide a fair defense of your viewpoint.
							This discourages many people from contributing at all, leaving debates only for the "hard-core".`}
						solution={`Because debates and arguments persist in the global debate map, you don't need to "explain it all" for your viewpoint to be fairly represented.
							Instead, you can supply only what you see has not been added yet, letting you contribute often and on many topics.`}/>
					
					<h2>Other features</h2>

					<h3>Fine-grained statistical information</h3>

					<P>With:
					<List items={[
						`Beliefs and arguments broken down into their constituent parts.`,
						`Rating and tagging of each piece by users.`,
						`Filtering of the data based on user self-tagging (and other properties).`,
					]}/>
					it becomes possible to do very fine-grained studies of public opinion.</P>

					<P>For example, one can now easily answer questions such as:
					<List items={[
						`How do flat-earthers reconcile the time-zone differences between east and west hemispheres?`,
						`What president would have been elected, if the candidates were voted on by those living in country X?`,
						`Is there any correlation between one's political group, and their preference in mobile phone operating systems?`,
						`How much has support for legal marijuana changed over the past 5 years? And what changes in arguments and argument perceptions correspond with this?`,
					]}/></P>

					<h3>Detailed worldview sharing</h3>

					<P>By acting as a global, crowd-sourced tree of theses, communicating your view of the world becomes much faster. Instead of writing instance-specific text
						for each conversation, you can map your views once, and simply form a "remix" of your personal belief tree that is tailored for the conversation at hand.</P>

					<P>The conversation can then proceed from that point, with the reasoning behind your views now known and easily referencable in the background.</P>

					<h3>Assisted worldview examination</h3>

					<P>Engaging with a tool that operates on percentages, numbers, and weights makes self-accountability easier to achieve:
						by entering numbers, one is declaring to himself how much he considers his beliefs to be supported, and by what means.
					This allows one to then do tool-based analysis on his views, and more easily spot areas of possible bias or unjustified conclusions.</P>

					<P>One can then proceed to look more closely at those areas, examining the pool of existing evidence and reasoning,
						and referencing statistics on how the rest of the population considers each piece along the way.</P>

					<P>More info on open-source projects: <Link to="https://opensource.com/resources/what-open-source"/><br/>
					This project's GitHub repo (source code): <Link to="https://github.com/debate-map/app"/></P>
				</article>
			</PageContainer>
		);
	}
}