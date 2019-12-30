export interface Pattern {
	name: string;
	regex: RegExp;
}
export interface Segment {
	patternMatched: string;
	textParts: string[];
}

export function ParseSegmentsForPatterns(text: string, patterns: Pattern[]): Segment[] {
	var segments = [] as Segment[];
	var textRemaining = text;

	while (textRemaining.length) {
		let match: RegExpMatchArray;
		for (const pattern of patterns) {
			match = pattern.regex.exec(textRemaining);
			if (match) {
				const partNotUsed = textRemaining.substr(0, match.index);
				if (partNotUsed.length) segments.push({patternMatched: null, textParts: [partNotUsed]});

				segments.push({patternMatched: pattern.name, textParts: match});
				textRemaining = textRemaining.substr(match.index + match[0].length);
				break;
			}
		}

		if (!match) {
			const partNotUsed = textRemaining;
			if (partNotUsed.length) segments.push({patternMatched: null, textParts: [partNotUsed]});
			textRemaining = "";
		}
	}

	return segments;
}