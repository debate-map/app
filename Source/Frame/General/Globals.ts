G({ToPercent});
function ToPercent(valueFrom0To1: number) {
	return valueFrom0To1 * 100;
}

G({ToPercentStr});
function ToPercentStr(valueFrom0To1: number) {
	return `${ToPercent(valueFrom0To1).RoundTo_Str(1)}%`;
}