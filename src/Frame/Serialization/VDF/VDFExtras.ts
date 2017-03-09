import {VDF} from "./VDF";
import {T, VDFPropInfo} from "./VDFTypeInfo";
// classes
// ==========

export class VDFNodePathNode {
	obj: any;

	// if not root (i.e. a child/descendant)
	prop: VDFPropInfo; //string propName;
	list_index: Number = null;
	map_keyIndex: Number = null;
	map_key: any;

	constructor(obj = null, prop: VDFPropInfo = null, list_index: Number = null, map_keyIndex: Number = null, map_key = null) {
		this.obj = obj;
		this.prop = prop;
		this.list_index = list_index;
		this.map_keyIndex = map_keyIndex;
		this.map_key = map_key;
	}

	//Clone(): VDFNodePathNode { return new VDFNodePathNode(this.obj, this.prop, this.list_index, this.map_keyIndex, this.map_key); }

	// for debugging
	toString() {
		if (this.list_index != null)
			return "i:" + this.list_index;
		if (this.map_keyIndex != null)
			return "ki:" + this.map_keyIndex;
		if (this.map_key != null)
			return "k:" + this.map_key;
		if (this.prop != null)
			//return "p:" + this.prop.name;
			return this.prop.name;
		return "";
	}
}
export class VDFNodePath {
	nodes: VDFNodePathNode[];
	constructor(nodes: VDFNodePathNode[]);
	constructor(rootNode: VDFNodePathNode);
	constructor(nodes_orRootNode) {
		this.nodes = nodes_orRootNode instanceof Array ? nodes_orRootNode : [nodes_orRootNode];
	}

	get rootNode() { return this.nodes[0]; }
	get parentNode() { return this.nodes.length >= 2 ? this.nodes[this.nodes.length - 2] : null; }
	get currentNode() { return this.nodes[this.nodes.length - 1]; }

	ExtendAsListItem(index: number, obj) {
		var newNodes = this.nodes.slice(0);
		newNodes.push(new VDFNodePathNode(obj, null, index));
		return new VDFNodePath(newNodes);
	}
	ExtendAsMapKey(keyIndex, obj) {
		var newNodes = this.nodes.slice(0);
		newNodes.push(new VDFNodePathNode(obj, null, null, keyIndex));
		return new VDFNodePath(newNodes);
	}
	ExtendAsMapItem(key, obj) {
		var newNodes = this.nodes.slice(0);
		newNodes.push(new VDFNodePathNode(obj, null, null, null, key));
		return new VDFNodePath(newNodes);
	}
	ExtendAsChild(prop: VDFPropInfo, obj) {
		var newNodes = this.nodes.slice(0);
		newNodes.push(new VDFNodePathNode(obj, prop));
		return new VDFNodePath(newNodes);
	}

	// for debugging
	toString() {
		var result = "";
		var index = 0;
		for (let node of this.nodes)
			result += (index++ == 0 ? "" : "/") + node;
		return result;
	}
}

// helper functions
// ==========

export function ConvertObjectTypeNameToVDFTypeName(objectTypeName: string) {
	if (objectTypeName == "Boolean")
		return "bool";
	if (objectTypeName == "Number")
		return "double";
	if (objectTypeName == "String")
		return "string";
	if (objectTypeName == "Object") // if anonymous-object
		return "object";
	if (objectTypeName == "Array")
		return "List(object)";
	return objectTypeName;
}

// helper classes
// ==================

class VDFUtils {
	/*static SetUpHiddenFields(obj, addSetters?: boolean, ...fieldNames) 	{
		if (addSetters && !obj._hiddenFieldStore)
			Object.defineProperty(obj, "_hiddenFieldStore", {enumerable: false, value: {}});
		for (var i in fieldNames)
			(()=>{
				var propName = fieldNames[i];
				var origValue = obj[propName];
				if (addSetters)
					Object.defineProperty(obj, propName, 					{
						enumerable: false,
						get: ()=>obj["_hiddenFieldStore"][propName],
						set: value=>obj["_hiddenFieldStore"][propName] = value
					});
				else
					Object.defineProperty(obj, propName, 					{
						enumerable: false,
						value: origValue //get: ()=>obj["_hiddenFieldStore"][propName]
					});
				obj[propName] = origValue; // for 'hiding' a prop that was set beforehand
			})();
	}*/
	static MakePropertiesHidden(obj, alsoMakeFunctionsHidden?: boolean, addSetters?: boolean) {
		for (var propName in obj) {
			var propDescriptor = Object.getOwnPropertyDescriptor(obj, propName);
			if (propDescriptor) {
				propDescriptor.enumerable = false;
				Object.defineProperty(obj, propName, propDescriptor);
			}
			//else if (alsoMakeFunctionsHidden && obj[propName] instanceof Function)
			//	VDFUtils.SetUpHiddenFields(obj, addSetters, propName);
		}
	}
}
export class StringBuilder {
	constructor(startData?: string) {
		if (startData)
			this.Append(startData);
	}

	parts = [];
	length = 0;
	
	Append(str) { this.parts.push(str); this.length += str.length; return this; } // adds string str to the StringBuilder
	Insert(index, str) { this.parts.splice(index, 0, str); this.length += str.length; return this; } // inserts string 'str' at 'index'
	Remove(index, count) { // starting at 'index', removes specified number of elements (if not specified, count defaults to 1)
		var removedItems = this.parts.splice(index, count != null ? count : 1);
		for (var i = 0; i < removedItems.length; i++)
			this.length -= removedItems[i].length;
		return this;
	}
	Clear() {
		//this.splice(0, this.length);
		this.parts.length = 0;
		this.length = 0;
	}
	ToString(joinerString?) { return this.parts.join(joinerString || ""); } // builds the string
}

// VDF-usable data wrappers
// ==========

//class object {} // for use with VDF.Deserialize, to deserialize to an anonymous object
// for anonymous objects (JS anonymous-objects are all just instances of Object, so we don't lose anything by attaching type-info to the shared constructor)
//var object = Object;
//object["typeInfo"] = new VDFTypeInfo(null, true);

export class EnumValue {
	realTypeName: string; // prop-name is special; used to identify 'true' or 'represented' type of object
	//intValue: number;
	stringValue: string;
	constructor(enumTypeName: string, intValue: number) {
		this.realTypeName = enumTypeName;
		//this.intValue = intValue;
		this.stringValue = EnumValue.GetEnumStringForIntValue(enumTypeName, intValue);
	}
	toString() { return this.stringValue; }

	static IsEnum(typeName: string): boolean { return window[typeName] && window[typeName]["_IsEnum"] === 0; }
	//static IsEnum(typeName: string): boolean { return window[typeName] && /}\)\((\w+) \|\| \(\w+ = {}\)\);/.test(window[typeName].toString()); }
	static GetEnumIntForStringValue(enumTypeName: string, stringValue: string) { return eval(enumTypeName + "[\"" + stringValue + "\"]"); }
	static GetEnumStringForIntValue(enumTypeName: string, intValue: number) { return eval(enumTypeName + "[" + intValue + "]"); }
}

function TypeOrNameOrGetter_ToName<T>(typeOrNameOrGetter?: string | (new(..._)=>T) | ((_?)=>new(..._)=>T)): string {
	return typeOrNameOrGetter instanceof Function && typeOrNameOrGetter.name ? typeOrNameOrGetter.name :
		typeOrNameOrGetter instanceof Function ? (typeOrNameOrGetter as any)().name :
		typeOrNameOrGetter;
}

export class List<T> extends Array<T> {
	/** usage: @T(_=>List.G(_=>ItemType)) prop1; */
	/*static G<T>(itemTypeGetterFunc: (_?)=>new(..._)=>T): string {
		var type = itemTypeGetterFunc() as any;
		return `List(${type.name})`;
	}*/

	constructor(itemTypeOrNameOrGetter?: string | (new(..._)=>T) | ((_?)=>new(..._)=>T), ...items: T[]) {
		//super(...items);
		super();
		(this as any).__proto__ = List.prototype;
		//Object.setPrototypeOf(this, List.prototype);

		// this can occur when calling .slice on a List; it internally calls this constructor, passing a number for the first arg
		if (itemTypeOrNameOrGetter == null) return;
		
		this.AddRange(items);
		this.itemType = ConvertObjectTypeNameToVDFTypeName(TypeOrNameOrGetter_ToName(itemTypeOrNameOrGetter));
	}

	itemType: string;

	// properties
	get Count() { return this.length; }
	get Entries(): [number, T][] {
		var entries = [];
		for (var i = 0; i < this.length; i++)
			entries.push([i, this[i]]);
		return entries;
	}

	/*s.Indexes = function () {
		var result = {};
		for (var i = 0; i < this.length; i++)
			result[i] = this[i];
		return result;
	}*/
	Add(...items) { return this.push.apply(this, items); }
	AddRange(items) {
		/*for (var i = 0; i < items.length; i++)
			this.push(items[i]);*/
		this.push(...items);
	}
	Insert(index, item) { return this.splice(index, 0, item); }
	InsertRange(index, items) { return this.splice.apply(this, [index, 0].concat(items)); }
	Remove(item) { return this.RemoveAt(this.indexOf(item)) != null; }
	RemoveAt(index) { return this.splice(index, 1)[0]; }
	RemoveRange(index, count) { return this.splice(index, count); }
	Any(matchFunc?: (item: T, index: number)=>boolean) {
		if (matchFunc == null)
			return this.length > 0;
		for (let [index, item] of this.Entries) {
			if (matchFunc.call(item, item, index))
				return true;
		}
		return false;
	}
	All(matchFunc: (item: T, index: number)=>boolean) {
		for (let [index, item] of this.Entries) {
			if (!matchFunc.call(item, item, index))
				return false;
		}
		return true;
	}
	Select<T2>(selectFunc: (item: T, index: number)=>T2, itemType?) {
		var result = new List<T2>(itemType || "object");
		for (let [index, item] of this.Entries)
			result.Add(selectFunc.call(item, item, index));
		return result;
	}
	First(matchFunc?: (item: T, index: number)=>boolean) {
		var result = this.FirstOrX(matchFunc);
		if (result == null)
			throw new Error("Matching item not found.");
		return result;
	}
	FirstOrX(matchFunc?: (item: T, index: number)=>boolean, x: T = null) {
		if (matchFunc) {
			for (let [index, item] of this.Entries) {
				if (matchFunc.call(item, item, index))
					return item;
			}
		} else if (this.length > 0)
			return this[0];
		return x;
	}
	Last(matchFunc?: (item: T, index: number)=>boolean) {
		var result = this.LastOrX(matchFunc);
		if (result == null)
			throw new Error("Matching item not found.");
		return result;
	}
	LastOrX(matchFunc?: (item: T, index: number)=>boolean, x: T = null) {
		if (matchFunc) {
			for (var i = this.length - 1; i >= 0; i--) {
				if (matchFunc.call(this[i], this[i], i))
					return this[i];
			}
		} else if (this.length > 0)
			return this[this.length - 1];
		return x;
	}
	GetRange(index, count) {
		var result = new List(this.itemType);
		for (var i = index; i < index + count; i++)
			result.Add(this[i]);
		return result;
	}
	Contains(item) { return this.indexOf(item) != -1; }
}
window["List"] = List;

export class Dictionary<K, V> {
	/** usage: @T(_=>Dictionary.G(_=>KeyType, _=>ValueType)) prop1; */
	/*static G<K, V>(keyTypeGetterFunc: (_?)=>new(..._)=>K, valueTypeGetterFunc: (_?)=>new(..._)=>V): string {
		var keyType = keyTypeGetterFunc() as any;
		var valueType = valueTypeGetterFunc() as any;
		return `Dictionary(${keyType.name} ${valueType.name})`;
	}*/

	constructor(keyTypeOrNameOrGetter?: string | (new(..._)=>K) | ((_?)=>new(..._)=>K),
			valueTypeOrNameOrGetter?: string | (new(..._)=>V) | ((_?)=>new(..._)=>V),
			keyValuePairsObj?) {
		var keyType = ConvertObjectTypeNameToVDFTypeName(TypeOrNameOrGetter_ToName(keyTypeOrNameOrGetter));
		var valueType = ConvertObjectTypeNameToVDFTypeName(TypeOrNameOrGetter_ToName(valueTypeOrNameOrGetter));

		//VDFUtils.SetUpHiddenFields(this, true, "realTypeName", "keyType", "valueType", "keys", "values");
		this.realTypeName = "Dictionary(" + keyType + " " + valueType + ")";
		this.keyType = keyType;
		this.valueType = valueType;
		this.keys = [];
		this.values = [];

		if (keyValuePairsObj)
			for (var key in keyValuePairsObj)
				this.Set(<K><any>key, keyValuePairsObj[key]);
	}

	realTypeName: string;
	keyType: string;
	valueType: string;
	keys: K[];
	values: V[];

	// properties
	/*get Keys() { // (note that this will return each key's toString() result (not the key itself, for non-string keys))
		var result = {};
		for (var i = 0; i < this.keys.length; i++)
			result[<any>this.keys[i]] = null;
		return result;
	}*/
	get Pairs() {
		var result = [] as {index: number, key: K, value: V}[];
		for (var i = 0; i < this.keys.length; i++)
			result.push({index: i, key: this.keys[i], value: this.values[i]});
		return result;
	}
	get Count() { return this.keys.length; }

	// methods
	ContainsKey(key: K) { return this.keys.indexOf(key) != -1; }
	Get(key: K) { return this.values[this.keys.indexOf(key)]; }
	Set(key: K, value: V) {
		if (this.keys.indexOf(key) == -1)
			this.keys.push(key);
		this.values[this.keys.indexOf(key)] = value;
		if (typeof key == "string")
			(<any>this)[<any>key] = value; // make value accessible directly on Dictionary object
	}
	Add(key: K, value: V) {
		if (this.keys.indexOf(key) != -1)
			throw new Error("Dictionary already contains key '" + key + "'.");
		this.Set(key, value);
	}
	Remove(key: K) {
		var itemIndex = this.keys.indexOf(key);
		if (itemIndex == -1) return;
		this.keys.splice(itemIndex, 1);
		this.values.splice(itemIndex, 1);
		delete (<any>this)[<any>key];
	}
}
window["Dictionary"] = Dictionary;
//VDFUtils.MakePropertiesHidden(Dictionary.prototype, true);

var a = null;