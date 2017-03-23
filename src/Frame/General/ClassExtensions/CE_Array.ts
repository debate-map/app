interface Array<T> { Contains(item: T): boolean; }
//Array.prototype._AddFunction_Inline = function Contains(items) { return this.indexOf(items) != -1; };
Array.prototype._AddFunction_Inline = function ContainsAny(...items) {
    for (let item of items)
        if (this.indexOf(item) != -1)
            return true;
    return false;
};

// for some reason, this platform doesn't have entries() defined
Array.prototype._AddFunction_Inline = function entries() {
	var result = [];
	for (var i = 0; i < this.length; i++)
		result.push([i, this[i]]);
	return result;
};

Array.prototype._AddFunction_Inline = function Prepend(...newItems) { this.splice(0, 0, ...newItems); };
Array.prototype._AddFunction_Inline = function Add(item) { return this.push(item); };
Array.prototype._AddFunction_Inline = function CAdd(item) { this.push(item); return this; }; // CAdd = ChainAdd
Array.prototype._AddFunction_Inline = function TAdd(item) { this.push(item); return item; }; // TAdd = TransparentAdd
interface Array<T> { AddRange(items: T[]): this; }
Array.prototype._AddFunction_Inline = function AddRange(array) {
	this.push(...array);
	return this;
};
interface Array<T> { Remove(item: T): boolean; }
Array.prototype._AddFunction_Inline = function Remove(item) {
	/*for (var i = 0; i < this.length; i++)
		if (this[i] === item)
			return this.splice(i, 1);*/
	var itemIndex = this.indexOf(item);
	var removedItems = this.splice(itemIndex, 1);
	return removedItems.length > 0;
};
interface Array<T> { RemoveAll(items: T[]): void; }
Array.prototype._AddFunction_Inline = function RemoveAll(items) {
    for (let item of items)
        this.Remove(item);
};
interface Array<T> { RemoveAt(index: number): T; }
Array.prototype._AddFunction_Inline = function RemoveAt(index) { return this.splice(index, 1)[0]; };
interface Array<T> { Insert(index: number, obj: T): void; }
Array.prototype._AddFunction_Inline = function Insert(index, obj) { this.splice(index, 0, obj); }

interface Array<T> { Reversed(): T[]; }
Array.prototype._AddFunction_Inline = function Reversed() { 
	var clone = this.slice(0);
	clone.reverse();
	return clone;
}

//Object.prototype._AddFunction_Inline = function AsRef() { return new NodeReference_ByPath(this); }

// Linq replacements
// ----------

interface Array<T> { Any(matchFunc: (item: T, index?: number)=>boolean): boolean; }
Array.prototype._AddFunction_Inline = function Any(matchFunc) {
    for (let [index, item] of this.entries())
        if (matchFunc == null || matchFunc.call(item, item, index))
            return true;
    return false;
};
interface Array<T> { All(matchFunc: (item: T, index?: number)=>boolean): boolean; }
Array.prototype._AddFunction_Inline = function All(matchFunc) {
    for (let [index, item] of this.entries())
        if (!matchFunc.call(item, item, index))
            return false;
    return true;
};
interface Array<T> { Where(matchFunc: (item: T, index?: number)=>boolean): T[]; }
Array.prototype._AddFunction_Inline = function Where(matchFunc) {
	var result = this instanceof List ? new List(this.itemType) : [];
	for (let [index, item] of this.entries())
		if (matchFunc.call(item, item, index)) // call, having the item be "this", as well as the first argument
			result.Add(item);
	return result;
};
interface Array<T> { Select<T2>(matchFunc: (item: T, index?: number)=>T2): T2[]; }
Array.prototype._AddFunction_Inline = function Select(selectFunc) {
	var result = this instanceof List ? new List(this.itemType) : [];
	for (let [index, item] of this.entries())
		result.Add(selectFunc.call(item, item, index));
	return result;
};
interface Array<T> { SelectMany<T2>(matchFunc: (item: T, index?: number)=>T2[]): T2[]; }
Array.prototype._AddFunction_Inline = function SelectMany(selectFunc) {
	var result = this instanceof List ? new List(this.itemType) : [];
	for (let [index, item] of this.entries())
		result.AddRange(selectFunc.call(item, item, index));
	return result;
};
//Array.prototype._AddFunction_Inline = function Count(matchFunc) { return this.Where(matchFunc).length; };
//Array.prototype._AddFunction_Inline = function Count(matchFunc) { return this.Where(matchFunc).length; }; // needed for items to be added properly to custom classes that extend Array
Array.prototype._AddGetter_Inline = function Count() { return this.length; }; // needed for items to be added properly to custom classes that extend Array
interface Array<T> { VCount(matchFunc: (item: T)=>boolean): number; }
Array.prototype._AddFunction_Inline = function VCount(matchFunc) { return this.Where(matchFunc).length; };
interface Array<T> { Clear(): void; }
Array.prototype._AddFunction_Inline = function Clear() {
	/*while (this.length > 0)
		this.pop();*/
    this.splice(0, this.length);
};
interface Array<T> { First(matchFunc?: (item: T, index: number)=>boolean): T; }
Array.prototype._AddFunction_Inline = function First(matchFunc?) {
	var result = this.FirstOrX(matchFunc);
	if (result == null)
		throw new Error("Matching item not found.");
	return result;
}
interface Array<T> { FirstOrX(matchFunc?: (item: T, index: number)=>boolean, x?): T; }
Array.prototype._AddFunction_Inline = function FirstOrX(matchFunc?, x = null) {
	if (matchFunc) {
		for (let [index, item] of this.entries()) {
			if (matchFunc.call(item, item, index))
				return item;
		}
	} else if (this.length > 0)
		return this[0];
	return x;
}
//Array.prototype._AddFunction_Inline = function FirstWithPropValue(propName, propValue) { return this.Where(function() { return this[propName] == propValue; })[0]; };
Array.prototype._AddFunction_Inline = function FirstWith(propName, propValue) { return this.Where(function() { return this[propName] == propValue; })[0]; };
interface Array<T> { Last(matchFunc?: (item: T, index: number)=>boolean): T; }
Array.prototype._AddFunction_Inline = function Last(matchFunc?) {
	var result = this.LastOrX(matchFunc);
	if (result == null)
		throw new Error("Matching item not found.");
	return result;
}
interface Array<T> { LastOrX(matchFunc?: (item: T, index: number)=>boolean, x?): T; }
Array.prototype._AddFunction_Inline = function LastOrX(matchFunc?, x = null) {
	if (matchFunc) {
		for (var i = this.length - 1; i >= 0; i--) {
			if (matchFunc.call(this[i], this[i], i))
				return this[i];
		}
	} else if (this.length > 0)
		return this[this.length - 1];
	return x;
}
Array.prototype._AddFunction_Inline = function XFromLast(x) { return this[(this.length - 1) - x]; };

// since JS doesn't have basic "foreach" system
Array.prototype._AddFunction_Inline = function ForEach(func) {
	for (var i in this)
		func.call(this[i], this[i], i); // call, having the item be "this", as well as the first argument
};

Array.prototype._AddFunction_Inline = function Move(item, newIndex) {
	var oldIndex = this.indexOf(item);
	this.RemoveAt(oldIndex);
	if (oldIndex < newIndex) // new-index is understood to be the position-in-list to move the item to, as seen before the item started being moved--so compensate for remove-from-old-position list modification
		newIndex--;
	this.Insert(newIndex, item);
};

Array.prototype._AddFunction_Inline = function ToList(itemType = null) {
	if (this instanceof List)
		return List.apply(null, [itemType || "object"].concat(this));
    return [].concat(this);
}
Array.prototype._AddFunction_Inline = function ToDictionary(keyFunc, valFunc) {
	var result = new Dictionary();
	for (var i in this)
		result.Add(keyFunc(this[i]), valFunc(this[i]));
	return result;
}
interface Array<T> { ToMap(keyFunc: (item: T)=>string, valFunc: (item: T)=>any): any; }
Array.prototype._AddFunction_Inline = function ToMap(keyFunc, valFunc) {
	var result = {};
	for (let item of this)
		result[keyFunc(item)] = valFunc(item);
	return result;
}
interface Array<T> { Skip(count: number): T[]; }
Array.prototype._AddFunction_Inline = function Skip(count) {
	var result = [];
	for (var i = count; i < this.length; i++)
		result.push(this[i]);
	return result;
};
interface Array<T> { Take(count: number): T[]; }
Array.prototype._AddFunction_Inline = function Take(count) {
	var result = [];
	for (var i = 0; i < count && i < this.length; i++)
		result.push(this[i]);
	return result;
};
Array.prototype._AddFunction_Inline = function TakeLast(count) {
	var result = [];
	for (var i = 0; i < count && (this.length - 1) - i >= 0; i++)
		result.push(this[(this.length - 1) - i]);
	return result;
};
interface Array<T> { FindIndex(matchFunc?: (item: T, index: number)=>boolean): number; }
Array.prototype._AddFunction_Inline = function FindIndex(matchFunc) {
	for (let [index, item] of this.entries()) {
		if (matchFunc.call(item, item, index)) // call, having the item be "this", as well as the first argument
			return index;
	}
	return -1;
};
/*Array.prototype._AddFunction_Inline = function FindIndex(matchFunc) {
    for (let [index, item] of this.entries())
        if (matchFunc.call(item, item))
            return index;
    return -1;
};*/
interface Array<T> { OrderBy(valFunc?: (item: T)=>number): T[]; }
Array.prototype._AddFunction_Inline = function OrderBy(valFunc = a=>a) {
	/*var temp = this.ToList();
	temp.sort((a, b)=>V.Compare(valFunc(a), valFunc(b)));
	return temp;*/
	var V_ = require("../../V/V").default;
    return V_.StableSort(this, (a, b)=>V_.Compare(valFunc(a), valFunc(b)));
};
interface Array<T> { Distinct(): T[]; }
Array.prototype._AddFunction_Inline = function Distinct() {
	var result = [];
	for (var i in this)
		if (!result.Contains(this[i]))
			result.push(this[i]);
	return result;
};
interface Array<T> {
	Except(...excludeItems: T[]): T[];
}
Array.prototype._AddFunction_Inline = function Except(...excludeItems) {
	return this.Where(a=>!excludeItems.Contains(a));
};

//Array.prototype._AddFunction_Inline = function JoinUsing(separator) { return this.join(separator);};
interface Array<T> { Min(valFunc?: (item: T)=>number): T; }
Array.prototype._AddFunction_Inline = function Min(valFunc = a=>a) {
    return this.OrderBy(valFunc).First();
};
interface Array<T> { Max(valFunc?: (item: T)=>number): T; }
Array.prototype._AddFunction_Inline = function Max(valFunc = a=>a) {
    return this.OrderBy(valFunc).Last();
};
Array.prototype._AddFunction_Inline = function Sum() {
    var total = 0;
	for (let item of this)
		total += item;
	return total;
};
Array.prototype._AddFunction_Inline = function Average() {
    var total = this.Sum();
	return total / this.length;
};
Array.prototype._AddFunction_Inline = function Median() {
    var ordered = this.OrderBy(a=>a);
	if (this.length % 2 == 0) // if even number of elements, average two middlest ones
		return ordered[(this.length / 2) - 1] + ordered[this.length / 2];
	return ordered[this.length / 2]; // otherwise, return the exactly-middle one
};

// ArrayIterator
// ==========

/*var ArrayIterator = [].entries().constructor;
ArrayIterator.prototype._AddFunction_Inline = function ToArray() {
    return Array.from(this);
};*/