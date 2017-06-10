interface Number { IfN1Then<T>(valIfSelfIsNeg1: T): T; }
Number.prototype._AddFunction_Inline = function IfN1Then(this: number, valIfSelfIsNeg1) {
	return this != -1 ? this : valIfSelfIsNeg1;
};

//Number.prototype._AddFunction_Inline = function RoundToMultipleOf(step) { return Math.round(new Number(this) / step) * step; }; //return this.lastIndexOf(str, 0) === 0; };
interface Number { ToPercentStr(precision?: number): string; }
Number.prototype._AddFunction_Inline = function ToPercentStr(this: number, precision?: number) {
	let number = this * 100;
	if (precision != null)
		return number.toFixed(precision) + "%";
	return number.toString() + "%";
};

interface Number { RoundTo(multiple: number): number; }
Number.prototype._AddFunction_Inline = function RoundTo(this: number, multiple) {
	//return Math.round(this / multiple) * multiple;
	// Don't ask me why this works, but it does, and is faster. From: http://phrogz.net/round-to-nearest-via-modulus-division
	/*var half = multiple / 2;
	return (this + half) - ((this + half) % multiple);*/

	// This version handles fractions better. Ex: (.2 + .1).RoundTo(.1) == .3 (NOT 0.3000000000000004, as the simpler approach gives)
	let multiple_inverted = 1 / multiple;
	return Math.round(this * multiple_inverted) / multiple_inverted;
};
interface Number { RoundTo_Str(multipleOf: number, removeEmptyFraction?: boolean): string; }
Number.prototype._AddFunction_Inline = function RoundTo_Str(this: number, multipleOf, removeEmptyFraction = true) {
	var resultValue = this.RoundTo(multipleOf);
	var result = resultValue.toFixed(multipleOf.toString().TrimStart("0").length); // - 1);
	if (removeEmptyFraction && result.Contains(".")) {
		result = result.TrimEnd("0").TrimEnd(".");
	}
	return result;
};
interface Number { FloorTo(multipleOf: number): number; }
Number.prototype._AddFunction_Inline = function FloorTo(this: number, multipleOf) { return Math.floor((new Number(this) as any) / multipleOf) * multipleOf; };
interface Number { FloorTo_Str(multipleOf: number): string; }
Number.prototype._AddFunction_Inline = function FloorTo_Str(this: number, multipleOf) {
	var resultValue = this.FloorTo(multipleOf);
	var result = resultValue.toFixed(multipleOf.toString().TrimStart("0").length); // - 1);
	if (result.Contains("."))
		result = result.TrimEnd("0").TrimEnd(".");
	return result;
};
interface Number { CeilingTo(multipleOf: number): number; }
Number.prototype._AddFunction_Inline = function CeilingTo(this: number, multipleOf) { return Math.ceil((new Number(this) as any) / multipleOf) * multipleOf; };
interface Number { CeilingTo_Str(multipleOf: number): string; }
Number.prototype._AddFunction_Inline = function CeilingTo_Str(this: number, multipleOf) {
	var resultValue = this.CeilingTo(multipleOf);
	var result = resultValue.toFixed(multipleOf.toString().TrimStart("0").length); // - 1);
	if (result.Contains("."))
		result = result.TrimEnd("0").TrimEnd(".");
	return result;
};

interface Number { KeepAtLeast(this: number, min: number): number; }
Number.prototype._AddFunction_Inline = function KeepAtLeast(min) {
	return Math.max(min, this);
};
interface Number { KeepAtMost(this: number, max: number): number; }
Number.prototype._AddFunction_Inline = function KeepAtMost(max) {
	return Math.min(max, this);
};
interface Number { KeepBetween(this: number, min: number, max: number): number; }
Number.prototype._AddFunction_Inline = function KeepBetween(min, max) {
	if (this < min) return min;
	if (this > max) return max;
	return this;
};
interface Number { WrapToRange(this: number, min: number, max: number, maxOut?: boolean): number; }
Number.prototype._AddFunction_Inline = function WrapToRange(min, max, maxOut = true) {
	let val = this;
	let size = max - min;
	while (val < min) val += size;
	while (maxOut ? val >= max : val > max) val -= size;
	return val;
};
interface Number { Distance(this: number, other: number): number; }
Number.prototype._AddFunction_Inline = function Distance(other) {
	return Math.abs(this - other);
};
interface Number { ToPower(this: number, power: number): number; }
Number.prototype._AddFunction_Inline = function ToPower(power: number) {
	return Math.pow(this, power);
};