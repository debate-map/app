import {InlineMath} from "react-katex";
import {BaseComponent} from "react-vextensions";
import ReactDOM from "react-dom";
import {TermPlaceholder} from "./NodeUI_Inner/TermPlaceholder";

// change InlineMath's generateHtml function to not break on katex parse-errors
let oldGenerateHtml = InlineMath.prototype.generateHtml;
InlineMath.prototype.generateHtml = function() {
	try {
		return oldGenerateHtml.apply(this, arguments);
	} catch (ex) {
		//return ex.message;
		if (ex.message.startsWith("KaTeX parse error: ")) {
			return ex.message.replace(/^KaTeX/, "LaTeX");
		}
	}
};

export function PreProcessLatex(text: string) {
	//text = text.replace(/\\term{/g, "\\text{");
	// "\term{some-term}{123}" -> "\text{@term[some-term,123]} 
	text = text.replace(/\\term{(.+?)}{([0-9]+?)}/g, (m, g1, g2)=>`\\text{@term[${g1},${g2}]}`);
	text = text.replace(/\\term/g, ()=>`[syntax wrong]`); // for user syntax mistakes, keep from causing error
	return text;
}

export class NodeMathUI extends BaseComponent<{text: string, onTermHover: (termID: number, hovered: boolean)=>void, onTermClick: (termID: number)=>void}, {}> {
	render() {
		let {text} = this.props;
		text = PreProcessLatex(text);
		return (
			<InlineMath math={text}/>
		);
	}

	PostRender() {
		let {onTermHover, onTermClick} = this.props;
		
		let dom = $(GetDOM(this));
		let termUIs = dom.find(".text").ToList();
		for (let termUI of termUIs) {
			let termTextMatch = termUI.text().match(/^@term\[(.+?),([0-9]+?)\]$/);
			if (!termTextMatch) continue; // if doesn't have marker, ignore
			//if (!termUI.next().is(".mopen")) continue; // if no term-id specified, ignore
			//if (!termUI.next().is(".mord.scriptstyle.uncramped.mtight")) continue; // if no term-id specified, ignore

			let refText = termTextMatch[1];

			//let siblingsForID = termUI.nextUntil(".mclose").add(termUI.nextAll(".mclose").first());
			/*let siblingsForID = termUI.next();
			//let termIDStr = siblingsForID.text().slice(2, -1); // "[t123]" -> "123"
			//let termIDStr = siblingsForID.text().slice(1, -1); // "[123]" -> "123"
			/*let match = siblingsForID.text().match(/^{([0-9]+)}$/);
			if (match == null) continue;
			let termIDStr = match[1]; // "{123}" -> "123"*#/
			let termIDStr = siblingsForID.text();
			/*let siblingsForID = termUI.nextUntil(".mclose").ToList();
			let termIDStr = siblingsForID.filter(a=>a.is(".mathrm")).map(a=>a.text()).join();*#/
			let termID = termIDStr.ToInt();*/
			let termID = termTextMatch[2].ToInt();
			if (IsNaN(termID)) continue;
			
			//let oldText = termUI.text();
			//termUI.text(`${oldText}[term: ${termID}]`);
			//siblingsForID.remove();
			/*for (let sibling of siblingsForID) {
				sibling.remove();
			}*/

			ReactDOM.render((
				<TermPlaceholder {...{store} as any} refText={refText} termID={termID} showVariantNumber={false}
					onHover={hovered=>onTermHover(termID, hovered)} onClick={()=>onTermClick(termID)}/>
			), termUI[0]);
		}
	}
}