export interface Pattern {
	name: string;
	regex: RegExp;
}
export interface Segment {
	text: string;
	patternMatches: Map<Pattern, RegExpMatchArray>;
}

export type MainMatchSelector = (patternNextMatches: Map<Pattern, RegExpMatchArray>)=>RegExpMatchArray;
export const MainMatchSelector_default: MainMatchSelector = patternNextMatches=>{
	return [...patternNextMatches.values()].OrderBy(a=>a.index)[0];
};

export function ParseTextForPatternMatchSegments(text: string, patterns: Pattern[], mainMatchSelector: MainMatchSelector = MainMatchSelector_default): Segment[] {
	var segments = [] as Segment[];
	var textRemaining = text;

	while (textRemaining.length) {
		const patternNextMatches = new Map<Pattern, RegExpMatchArray>();
		for (const pattern of patterns) {
			const match = pattern.regex.exec(textRemaining);
			if (match != null) {
				patternNextMatches.set(pattern, match);
			}
		}

		if (patternNextMatches.size) {
			const mainMatch = mainMatchSelector(patternNextMatches);
			const allMatchesForMainMatchText = [...patternNextMatches].filter(([pattern, match])=>{
				return match.index == mainMatch.index && match[0] == mainMatch[0];
			}).ToMap(a=>a[0], a=>a[1]);

			// add segment for text between last segment, and this new pattern-matched segment
			const unmatchedTextBeforeNewMatch = textRemaining.substr(0, mainMatch.index);
			if (unmatchedTextBeforeNewMatch.length) {
				segments.push({text: unmatchedTextBeforeNewMatch, patternMatches: new Map()});
			}

			segments.push({text: mainMatch[0], patternMatches: allMatchesForMainMatchText});
			textRemaining = textRemaining.substr(mainMatch.index! + mainMatch[0].length);
		} else {
			if (textRemaining.length) {
				segments.push({text: textRemaining, patternMatches: new Map()});
			}
			textRemaining = "";
		}
	}

	return segments;
}