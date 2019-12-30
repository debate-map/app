import {InlineMath} from "react-katex";
import {BaseComponent, GetDOM} from "react-vextensions";
import ReactDOM from "react-dom";
import {PreProcessLatex} from "Store/firebase/nodes/$node";
import {IsNaN} from "js-vextensions";
import {store} from "Store";
import {TermPlaceholder} from "./NodeUI_Inner/TermPlaceholder";

// change InlineMath's generateHtml function to not break on katex parse-errors
const oldGenerateHtml = InlineMath.prototype.generateHtml;
InlineMath.prototype.generateHtml = function() {
	try {
		return oldGenerateHtml.apply(this, arguments);
	} catch (ex) {
		// return ex.message;
		if (ex.message.startsWith("KaTeX parse error: ")) {
			return ex.message.replace(/^KaTeX/, "LaTeX");
		}
	}
};

export class NodeMathUI extends BaseComponent<{text: string, onTermHover: (termID: string, hovered: boolean)=>void, onTermClick: (termID: string)=>void}, {}> {
	render() {
		let {text} = this.props;
		text = PreProcessLatex(text);
		return (
			<InlineMath math={text}/>
		);
	}

	PostRender() {
		const {onTermHover, onTermClick} = this.props;

		const dom = $(GetDOM(this));
		const termUIs = dom.find(".text").ToList();
		for (const termUI of termUIs) {
			const termTextMatch = termUI.text().match(/^@term\[(.+?),([A-Za-z0-9_-]+?)\]$/);
			if (!termTextMatch) continue; // if doesn't have marker, ignore
			// if (!termUI.next().is(".mopen")) continue; // if no term-id specified, ignore
			// if (!termUI.next().is(".mord.scriptstyle.uncramped.mtight")) continue; // if no term-id specified, ignore

			const refText = termTextMatch[1];

			// let siblingsForID = termUI.nextUntil(".mclose").add(termUI.nextAll(".mclose").first());
			/* let siblingsForID = termUI.next();
			//let termIDStr = siblingsForID.text().slice(2, -1); // "[t123]" -> "123"
			//let termIDStr = siblingsForID.text().slice(1, -1); // "[123]" -> "123"
			/*let match = siblingsForID.text().match(/^{([A-Za-z0-9_-]+)}$/);
			if (match == null) continue;
			let termIDStr = match[1]; // "{123}" -> "123"*#/
			let termIDStr = siblingsForID.text();
			/*let siblingsForID = termUI.nextUntil(".mclose").ToList();
			let termIDStr = siblingsForID.filter(a=>a.is(".mathrm")).map(a=>a.text()).join();*#/
			let termID = termIDStr.ToInt(); */
			const termID = termTextMatch[2];
			if (IsNaN(termID)) continue;

			// let oldText = termUI.text();
			// termUI.text(`${oldText}[term: ${termID}]`);
			// siblingsForID.remove();
			/* for (let sibling of siblingsForID) {
				sibling.remove();
			} */

			ReactDOM.render((
				<TermPlaceholder {...{store} as any} refText={refText} termID={termID} showVariantNumber={false}
					onHover={hovered=>onTermHover(termID, hovered)} onClick={()=>onTermClick(termID)}/>
			), termUI[0]);
		}
	}
}