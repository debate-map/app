/*export function GetExportSwapperRule() {
	return {
		test: /\.jsx?$/,
		loader: StringReplacePlugin.replace({replacements: [
			// optimization; replace `State(a=>a.some.thing)` with `State('some/thing')`
			{
				pattern: /State\(a ?=> ?a\.([a-zA-Z_.]+)\)/g,
				replacement: function(match, sub1, offset, string) {
					return `State('${sub1.replace(/\./g, '/')}')`;
				}
			},
		]})
	};
}*/