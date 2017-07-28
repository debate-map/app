import {BaseComponent} from "../../../../../Frame/UI/ReactGlobals";
import {SourceChain, Source} from "Store/firebase/contentNodes/@SourceChain";
import Row from "Frame/ReactComponents/Row";
import Column from "../../../../../Frame/ReactComponents/Column";
import {URL} from "../../../../../Frame/General/URLs";

export default class SourcesUI extends BaseComponent<{sourceChains: SourceChain[]}, {}> {
	render() {
		let {sourceChains} = this.props;
		return (
			<Column mt={3} style={{whiteSpace: "normal"}}>
				{sourceChains.Any(chain=>chain.Any((source: Source)=>source.link && source.link.startsWith("https://biblia.com/bible/nkjv/"))) &&
					<Row style={{marginBottom: 3, opacity: .5, fontSize: 10}}>
						Scripture taken from the NKJV®. Copyright © 1982 by Thomas Nelson. Used by permission. All rights reserved.
					</Row>}
				<Row style={{color: "rgba(255,255,255,.5)"}}>Sources:</Row>
				{sourceChains.map((chain: SourceChain, index)=> {
					let linkTitle = chain.map((source, index)=> {
						if (source.link) {
							// if this is the first source, it's the most important, so show the link's whole url
							if (index == 0) {
								return URL.Parse(source.link, false).toString({domain_protocol: false});
							}
							// else, show just the domain-name
							let urlMatch = source.link.match(/https?:\/\/(?:www\.)?([^/]+)/);
							if (urlMatch == null) return source.link; // temp, while updating data
							return urlMatch[1];
						}
						return (source.name || "") + (source.author ? ` (${source.author})` : ""); 
					}).join(" <- ");
					return (
						<Row key={index}>
							<a href={chain.Last().link} style={{wordBreak: "break-word"}} onContextMenu={e=>e.nativeEvent["passThrough"] = true}>{linkTitle}</a>
						</Row>
					);
				})}
			</Column>
		);
	}
}