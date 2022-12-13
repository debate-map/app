import {InlineMath} from "react-katex";
import {BaseComponent, GetDOM} from "web-vcore/nm/react-vextensions.js";
import ReactDOM from "web-vcore/nm/react-dom";
import {IsNaN} from "web-vcore/nm/js-vextensions.js";
import {store} from "Store";
import {Term, PreProcessLatex} from "dm_common";
import {TermPlaceholder} from "./NodeUI_Inner/TermPlaceholder.js";

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

export class NodeMathUI extends BaseComponent<{text: string, onTermHover: (termID: string, hovered: boolean)=>void, onTermClick: (termID: string)=>void, termsToSearchFor: Term[]}, {}> {
	render() {
		let {text} = this.props;
		text = PreProcessLatex(text);
		return (
			<InlineMath math={text}/>
		);
	}

	PostRender() {
		const {onTermHover, onTermClick, termsToSearchFor} = this.props;

		const dom = GetDOM(this)!;
		const termUIs = Array.from(dom.querySelectorAll(".text")) as HTMLSpanElement[];
		for (const termUI of termUIs) {
			//const termTextMatch = termUI.text().match(/^@term\[(.+?),([A-Za-z0-9_-]+?)\]$/);
			const termTextMatch = termUI.innerText.match(/^@term\[(.+?)\]$/);
			if (!termTextMatch) continue; // if doesn't have marker, ignore
			// if (!termUI.next().is(".mopen")) continue; // if no term-id specified, ignore
			// if (!termUI.next().is(".mord.scriptstyle.uncramped.mtight")) continue; // if no term-id specified, ignore

			// the only white-space allowed in term-forms is a space, so convert any other white-space character in UI, into a space (latex renderer sometimes renders a no-break space)
			const termStr = termTextMatch[1];
			const termStr_asForm = termStr.toLowerCase().replace(/\s/g, " ");

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
			/*const termID = termTextMatch[2];
			if (IsNaN(termID)) continue;*/
			const term = termsToSearchFor.find(a=>a.forms.Contains(termStr_asForm));
			if (term == null) continue;

			// let oldText = termUI.text();
			// termUI.text(`${oldText}[term: ${termID}]`);
			// siblingsForID.remove();
			/* for (let sibling of siblingsForID) {
				sibling.remove();
			} */

			ReactDOM.render((
				<TermPlaceholder {...{store} as any} refText={termStr} termID={term.id} showKeyStart={false}
					onHover={hovered=>onTermHover(term.id, hovered)} onClick={()=>onTermClick(term.id)}/>
			), termUI);
		}
	}
}