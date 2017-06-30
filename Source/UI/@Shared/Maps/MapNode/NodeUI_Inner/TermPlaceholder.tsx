import { Connect } from "Frame/Database/FirebaseConnect";
import {GetTerm, GetTermVariantNumber} from "../../../../../Store/firebase/terms";
import {BaseComponent} from "../../../../../Frame/UI/ReactGlobals";
import {Term} from "../../../../../Store/firebase/terms/@Term";

@Connect((state, {termID}) => {
	let term = GetTerm(termID);
	return {
		term,
		termVariantNumber: term ? GetTermVariantNumber(term) : null,
	};
})
export class TermPlaceholder extends BaseComponent
		<{refText: string, termID: number, showVariantNumber?: boolean, onHover: (hovered: boolean)=>void, onClick: ()=>void}
			& Partial<{term: Term, termVariantNumber: number}>,
		{}> {
	static defaultProps = {showVariantNumber: true};
	render() {
		let {refText, termID, showVariantNumber, onHover, onClick, term, termVariantNumber} = this.props;
		//if (term == null) return <a>...</a>;
		//if (term == null) return <a>{refText}</a>;
		return (
			<a
					onMouseEnter={e=>onHover(true)}
					onMouseLeave={e=>onHover(false)}
					onClick={e=> {
						/*if (this.definitionsPanel == null) return;
						GetInnerComp(this.definitionsPanel).SetState({termFromLocalClick: GetTerm(termID)});*/
						//this.SetState({clickTermID: termID});
						onClick();
					}}>
				{/*term.name*/}
				{refText}
				{showVariantNumber &&
					<sup>{termVariantNumber || "?"}</sup>}
					{/*<sub>{termVariantNumber}</sub>}*/}
			</a>
		);
	}
}