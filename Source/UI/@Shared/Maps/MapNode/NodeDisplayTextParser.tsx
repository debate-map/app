export type SegmentType = "text" | "term";
export type Segment = {type: SegmentType, textParts: string[]};
export function ParseSegmentsFromNodeDisplayText(text: string): Segment[] {
	var segments = [] as Segment[];
	var textRemaining = text;

	while (textRemaining.length) {
		let match: RegExpMatchArray;
		for (let matcher of segmentMatchers) {
			match = matcher.regex.exec(textRemaining);
			if (match) {
				let partNotUsed = textRemaining.substr(0, match.index);
				if (partNotUsed.length)
					segments.push({type: "text", textParts: [partNotUsed]});

				segments.push({type: matcher.name, textParts: match});
				textRemaining = textRemaining.substr(match.index + match[0].length);
				break;
			}
		}

		if (!match) {
			let partNotUsed = textRemaining;
			if (partNotUsed.length)
				segments.push({type: "text", textParts: [partNotUsed]});
			textRemaining = "";
		}
	}

	return segments;
}

interface Transformer {
	name: SegmentType;
	regex: RegExp;
	//render(match: RegExpMatchArray): JSX.Element;
}
let segmentMatchers = [
	{
		name: "term",
		regex: /{(.+?)\}\[(.+?)\]/
		/*render: match=> {
			return <a>{match[1]}<sup>{match[2]}</sup></a>;
		}*/
	}
] as Transformer[];