interface Number { IfN1Then<T>(valIfSelfIsNeg1: T): T; }
Number.prototype._AddFunction_Inline = function IfN1Then(valIfSelfIsNeg1) {
	return this != -1 ? this : valIfSelfIsNeg1;
};

//Number.prototype._AddFunction_Inline = function RoundToMultipleOf(step) { return Math.round(new Number(this) / step) * step; }; //return this.lastIndexOf(str, 0) === 0; };
interface Number { ToPercentStr: (precision?: number)=>string; }
Number.prototype._AddFunction_Inline = function ToPercentStr(precision?: number) {
	let number = this * 100;
	if (precision != null)
		return number.toFixed(precision) + "%";
	return number.toString() + "%";
};

interface Number { RoundTo: (multipleOf: number)=>number; }
Number.prototype._AddFunction_Inline = function RoundTo(multipleOf) { return Math.round((new Number(this) as any) / multipleOf) * multipleOf; };
interface Number { RoundTo_Str: (multipleOf: number)=>string; }
Number.prototype._AddFunction_Inline = function RoundTo_Str(multipleOf) {
	var resultValue = this.RoundTo(multipleOf);
	var result = resultValue.toFixed(multipleOf.toString().TrimStart("0").length); // - 1);
	if (result.contains("."))
		result = result.TrimEnd("0").TrimEnd(".");
	return result;
};
interface Number { FloorTo: (multipleOf: number)=>number; }
Number.prototype._AddFunction_Inline = function FloorTo(multipleOf) { return Math.floor((new Number(this) as any) / multipleOf) * multipleOf; };
interface Number { FloorTo_Str: (multipleOf: number)=>string; }
Number.prototype._AddFunction_Inline = function FloorTo_Str(multipleOf) {
	var resultValue = this.FloorTo(multipleOf);
	var result = resultValue.toFixed(multipleOf.toString().TrimStart("0").length); // - 1);
	if (result.contains("."))
		result = result.TrimEnd("0").TrimEnd(".");
	return result;
};
interface Number { CeilingTo: (multipleOf: number)=>number; }
Number.prototype._AddFunction_Inline = function CeilingTo(multipleOf) { return Math.ceil((new Number(this) as any) / multipleOf) * multipleOf; };
interface Number { CeilingTo_Str: (multipleOf: number)=>string; }
Number.prototype._AddFunction_Inline = function CeilingTo_Str(multipleOf) {
	var resultValue = this.CeilingTo(multipleOf);
	var result = resultValue.toFixed(multipleOf.toString().TrimStart("0").length); // - 1);
	if (result.contains("."))
		result = result.TrimEnd("0").TrimEnd(".");
	return result;
};

interface Number { KeepAtLeast: (min: number)=>number; }
Number.prototype._AddFunction_Inline = function KeepAtLeast(min) {
	return Math.max(min, this);
};
interface Number { KeepAtMost: (max: number)=>number; }
Number.prototype._AddFunction_Inline = function KeepAtMost(max) {
	return Math.min(max, this);
};
interface Number { KeepBetween: (min: number, max: number)=>number; }
Number.prototype._AddFunction_Inline = function KeepBetween(min, max) {
	return Math.min(max, Math.max(min, this));
};
interface Number { WrapToRange: (min: number, max: number, asInt?: boolean)=>number; }
Number.prototype._AddFunction_Inline = function WrapToRange(min, max, asInt = true) {
	let val = this;
	let size = asInt ? 1 + (max - min) : max - min;
	while (val < min) val += size;
	while (val > max) val -= size;
	return val;
};
interface Number { Distance: (other: number)=>number; }
Number.prototype._AddFunction_Inline = function Distance(other) {
	return Math.abs(this - other);
};
interface Number { ToPower: (power: number)=>number; }
Number.prototype._AddFunction_Inline = function ToPower(power: number) {
	return Math.pow(this, power);
};