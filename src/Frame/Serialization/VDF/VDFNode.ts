import {Dictionary, EnumValue, List, StringBuilder, VDFNodePath, VDFNodePathNode} from "./VDFExtras";
import {VDF} from "./VDF";
import {VDFSaveOptions} from "./VDFSaver";
import {VDFLoadOptions} from "./VDFLoader";
import {VDFDeserialize, VDFDeserializeProp, VDFPostDeserialize, VDFPreDeserialize, VDFTypeInfo} from "./VDFTypeInfo";

export class VDFNode {
	metadata: string;
	metadata_override: string;
	primitiveValue: any;
	listChildren = new List<VDFNode>("VDFNode");
	mapChildren = new Dictionary<VDFNode, VDFNode>("VDFNode", "VDFNode"); // this also holds Dictionaries' keys/values
	
	constructor(primitiveValue?: any, metadata?: string) {
		this.primitiveValue = primitiveValue;
		this.metadata = metadata;
	}

	SetListChild(index: number, value: any) {
		this.listChildren[index] = value;
		this[index] = value;
	}
	/*InsertListChild(index: number, value: any) {
		var oldItems = this.listChildren;
		for (var i = 0; i < oldItems.length; i++) // we need to first remove old values, so the slate is clean for manual re-adding/re-ordering
			delete this[i];
		for (var i = 0; i < oldItems.length + 1; i++) // now add them all back in, in the correct order
			this.AddListChild(i == 0 ? value : (i < index ? oldItems[i] : oldItems[i - 1]));
	}*/
	AddListChild(value: any) { this.SetListChild(this.listChildren.length, value); }
	SetMapChild(key: VDFNode, value: VDFNode) {
		this.mapChildren.Set(key, value);
		if (typeof key.primitiveValue == "string")
			this[<string><any>key] = value;
	}

	toString() { return this.primitiveValue ? this.primitiveValue.toString() : ""; } // helpful for debugging

	// saving
	// ==================

	static PadString(unpaddedString: string): string {
		var result = unpaddedString;
		if (result.StartsWith("<") || result.StartsWith("#"))
			result = "#" + result;
		if (result.EndsWith(">") || result.EndsWith("#"))
			result += "#";
		return result;
	}

	isList: boolean; // can also be inferred from use of list-children collection
	isMap: boolean; // can also be inferred from use of map-children collection
	childPopOut: boolean;
	ToVDF(options: VDFSaveOptions = null, tabDepth = 0): string { return this.ToVDF_InlinePart(options, tabDepth) + this.ToVDF_PoppedOutPart(options, tabDepth); }
	static charsThatNeedEscaping_ifAnywhere_regex = /"|'|\n|\t|<<|>>/; // (well, anywhere in string)
	static charsThatNeedEscaping_ifNonQuoted_regex = /^([\t^# ,0-9.\-+]|null|true|false)|{|}|\[|\]|:/;
	ToVDF_InlinePart(options: VDFSaveOptions = null, tabDepth = 0, isKey = false): string {
		options = options || new VDFSaveOptions();

		var builder = new StringBuilder();

		var metadata = this.metadata_override != null ? this.metadata_override : this.metadata;
		if (options.useMetadata && metadata != null && metadata != "")
			builder.Append(metadata + ">");

		if (this.primitiveValue == null) {
			if (!this.isMap && this.mapChildren.Count == 0 && !this.isList && this.listChildren.Count == 0)
				builder.Append("null");
		}
		else if (typeof this.primitiveValue == "boolean")
			builder.Append(this.primitiveValue.toString().toLowerCase());
		else if (typeof this.primitiveValue == "string") {
			var unpaddedString = <string>this.primitiveValue;
			// (the parser doesn't actually need '<<' and '>>' wrapped for single-line strings, but we do so for consistency)
			var needsEscaping = VDFNode.charsThatNeedEscaping_ifAnywhere_regex.test(unpaddedString);
			if (isKey) // if key, we'll be trying to save without quotes, so be super escapy
				needsEscaping = needsEscaping || VDFNode.charsThatNeedEscaping_ifNonQuoted_regex.test(unpaddedString);
			if (needsEscaping) {
				var literalStartMarkerString = "<<";
				var literalEndMarkerString = ">>";
				while (unpaddedString.Contains(literalStartMarkerString) || unpaddedString.Contains(literalEndMarkerString)) {
					literalStartMarkerString += "<";
					literalEndMarkerString += ">";
				}
				builder.Append((isKey ? "" : "\"") + literalStartMarkerString + VDFNode.PadString(unpaddedString) + literalEndMarkerString + (isKey ? "" : "\""));
			}
			else
				builder.Append((isKey ? "" : "\"") + unpaddedString + (isKey ? "" : "\""));
		}
		else if (VDF.GetIsTypePrimitive(VDF.GetTypeNameOfObject(this.primitiveValue))) // if number
			builder.Append(options.useNumberTrimming && this.primitiveValue.toString().StartsWith("0.") ? this.primitiveValue.toString().substr(1) : this.primitiveValue);
		else
			builder.Append("\"" + this.primitiveValue + "\"");

		if (options.useChildPopOut && this.childPopOut) {
			if (this.isMap || this.mapChildren.Count > 0)
				builder.Append(this.mapChildren.Count > 0 ? "{^}" : "{}");
			if (this.isList || this.listChildren.Count > 0)
				builder.Append(this.listChildren.Count > 0 ? "[^]" : "[]");
		}
		else {
			if (this.isMap || this.mapChildren.Count > 0) {
				builder.Append("{");
				for (var i = 0, pair = null, pairs = this.mapChildren.Pairs; i < pairs.length && (pair = pairs[i]); i++) {
					var keyStr = pair.key.ToVDF_InlinePart(options, tabDepth, true);
					var valueStr = pair.value.ToVDF_InlinePart(options, tabDepth);
					builder.Append((i == 0 ? "" : (options.useCommaSeparators ? "," : " ")) + (options.useStringKeys ? "\"" : "") + keyStr + (options.useStringKeys ? "\"" : "") + ":" + valueStr);
				}
				builder.Append("}");
			}
			if (this.isList || this.listChildren.Count > 0) {
				builder.Append("[");
				for (var i = 0; i < this.listChildren.Count; i++)
					builder.Append((i == 0 ? "" : (options.useCommaSeparators ? "," : " ")) + this.listChildren[i].ToVDF_InlinePart(options, tabDepth));
				builder.Append("]");
			}
		}

		return builder.ToString();
	}
	ToVDF_PoppedOutPart(options: VDFSaveOptions = null, tabDepth = 0): string {
		options = options || new VDFSaveOptions();

		var builder = new StringBuilder();

		// include popped-out-content of direct children (i.e. a single directly-under group)
		if (options.useChildPopOut && this.childPopOut) {
			var childTabStr = "";
			for (let i = 0; i < tabDepth + 1; i++)
				childTabStr += "\t";
			if (this.isMap || this.mapChildren.Count > 0)
				for (let i = 0, pair = null, pairs = this.mapChildren.Pairs; i < pairs.length && (pair = pairs[i]); i++) {
					var keyStr = pair.key.ToVDF_InlinePart(options, tabDepth, true);
					var valueStr = pair.value.ToVDF_InlinePart(options, tabDepth + 1);
					builder.Append("\n" + childTabStr + (options.useStringKeys ? "\"" : "") + keyStr + (options.useStringKeys ? "\"" : "") + ":" + valueStr);
					let poppedOutChildText: string = pair.value.ToVDF_PoppedOutPart(options, tabDepth + 1);
					if (poppedOutChildText.length > 0)
						builder.Append(poppedOutChildText);
				}
			if (this.isList || this.listChildren.Count > 0)
				for (let item of this.listChildren) {
					builder.Append("\n" + childTabStr + item.ToVDF_InlinePart(options, tabDepth + 1));
					let poppedOutChildText = item.ToVDF_PoppedOutPart(options, tabDepth + 1);
					if (poppedOutChildText.length > 0)
						builder.Append(poppedOutChildText);
				}
		}
		else { // include popped-out-content of inline-items' descendents (i.e. one or more pulled-up groups)
			var poppedOutChildTexts = new List<string>("string");
			let poppedOutChildText: string;
			if (this.isMap || this.mapChildren.Count > 0)
				for (let i = 0, pair = null, pairs = this.mapChildren.Pairs; i < pairs.length && (pair = pairs[i]); i++)
					if ((poppedOutChildText = pair.value.ToVDF_PoppedOutPart(options, tabDepth)).length)
						poppedOutChildTexts.Add(poppedOutChildText);
			if (this.isList || this.listChildren.Count > 0) {
				for (let item of this.listChildren) {
					if ((poppedOutChildText = item.ToVDF_PoppedOutPart(options, tabDepth)).length)
						poppedOutChildTexts.Add(poppedOutChildText);
				}
			}
			for (let i = 0; i < poppedOutChildTexts.Count; i++) {
				poppedOutChildText = poppedOutChildTexts[i];
				var insertPoint = 0;
				while (poppedOutChildText[insertPoint] == '\n' || poppedOutChildText[insertPoint] == '\t')
					insertPoint++;
				builder.Append((insertPoint > 0 ? poppedOutChildText.substr(0, insertPoint) : "") + (i == 0 ? "" : "^") + poppedOutChildText.substr(insertPoint));
			}
		}

		return builder.ToString();
	}

	// loading
	// ==================

	public static CreateNewInstanceOfType(typeName: string) {
		var typeNameRoot = VDF.GetTypeNameRoot(typeName);
		var genericParameters = VDF.GetGenericArgumentsOfType(typeName);
		/*if (typeNameRoot == "List")
			return new List(genericParameters[0]);
		if (typeNameRoot == "Dictionary")
			return new Dictionary(genericParameters[0], genericParameters[1]);*/
		if (typeName.Contains("(")) // if generic type, supply generic-parameters as first arguments to constructor
	    	//return window[typeNameRoot].apply(null, genericParameters);
	    	return new (Function.prototype.bind.apply(window[typeNameRoot], [null].concat(<any>genericParameters)));
		if (!(window[typeNameRoot] instanceof Function))
			throw new Error("Could not find type \"" + typeName + "\".");
		return new (<{new(...args: any[]): any}><any>window[typeNameRoot]); // maybe todo: add code that resets props to their nulled-out/zeroed-out values (or just don't use any constructors, and just remember to set the __proto__ property afterward)
	}
	static GetCompatibleTypeNameForNode(node: VDFNode) { return node.mapChildren.Count ? "object" : (node.listChildren.length ? "List(object)" : "string"); }

	ToObject(options: VDFLoadOptions): any;
	ToObject(declaredTypeName?: string, options?: VDFLoadOptions, path?: VDFNodePath): any;
	ToObject(declaredTypeName_orOptions?: any, options = new VDFLoadOptions(), path?: VDFNodePath): any {
		if (declaredTypeName_orOptions instanceof VDFLoadOptions)
			return this.ToObject(null, declaredTypeName_orOptions);

		var declaredTypeName: string = declaredTypeName_orOptions;

		path = path || new VDFNodePath(new VDFNodePathNode());

		var fromVDFTypeName = "object";
		var metadata = this.metadata_override != null ? this.metadata_override : this.metadata;
		if (metadata != null && (window[VDF.GetTypeNameRoot(metadata)] instanceof Function || !options.loadUnknownTypesAsBasicTypes))
			fromVDFTypeName = metadata;
		else if (typeof this.primitiveValue == "boolean")
			fromVDFTypeName = "bool";
		else if (typeof this.primitiveValue == "number")
			fromVDFTypeName = this.primitiveValue.toString().Contains(".") ? "double" : "int";
		else if (typeof this.primitiveValue == "string")
			fromVDFTypeName = "string";
		else if (this.primitiveValue == null)
			if (this.isList || this.listChildren.Count > 0)
				fromVDFTypeName = "List(object)"; //"array";
			else if (this.isMap || this.mapChildren.Count > 0)
				fromVDFTypeName = "Dictionary(object object)"; //"object-anonymous"; //"object";

		var finalTypeName;
        if (window[VDF.GetTypeNameRoot(declaredTypeName)] instanceof Function || !options.loadUnknownTypesAsBasicTypes)
			finalTypeName = declaredTypeName;
		// if there is no declared type, or the from-metadata type is more specific than the declared type
		// (for last condition/way: also assume from-vdf-type is derived, if declared-type name is one of these extra (not actually implemented in JS) types)
		//if (finalTypeName == null || (<Function><object>window[VDF.GetTypeNameRoot(fromVDFTypeName)] || (()=>{})).IsDerivedFrom(<Function><object>window[VDF.GetTypeNameRoot(finalTypeName)] || (()=>{})) || ["object", "IList", "IDictionary"].Contains(finalTypeName))
		if (finalTypeName == null || VDF.IsTypeXDerivedFromY(fromVDFTypeName, finalTypeName) || ["object", "IList", "IDictionary"].Contains(finalTypeName))
			finalTypeName = fromVDFTypeName;

		var result;
		var deserializedByCustomMethod = false;
		var classProps = VDF.GetClassProps(window[finalTypeName]);
		for (var propName in classProps) //VDF.GetObjectProps(window[finalTypeName]))
			if (classProps[propName] instanceof Function && classProps[propName].tags && classProps[propName].tags.Any(a=> a instanceof VDFDeserialize && a.fromParent)) {
				var deserializeResult = classProps[propName](this, path, options);
				if (deserializeResult !== undefined) {
					result = deserializeResult;
					deserializedByCustomMethod = true;
					break;
				}
			}

		if (!deserializedByCustomMethod)
			if (finalTypeName == "object") { } //result = null;
			else if (EnumValue.IsEnum(finalTypeName)) // helper importer for enums
				result = EnumValue.GetEnumIntForStringValue(finalTypeName, this.primitiveValue);
			else if (VDF.GetIsTypePrimitive(finalTypeName)) { //primitiveValue != null)
				result = this.primitiveValue;
				if (finalTypeName == "int")
					result = parseInt(this.primitiveValue);
				else if (finalTypeName == "float" || finalTypeName == "double")
					result = parseFloat(this.primitiveValue);
			}
			else if (this.primitiveValue != null || this.isList || this.isMap) {
				result = VDFNode.CreateNewInstanceOfType(finalTypeName);
				path.currentNode.obj = result;
				this.IntoObject(result, options, path);
			}
		path.currentNode.obj = result; // in case post-deserialize method was attached as extra-method to the object, that makes use of the (basically useless) path.currentNode.obj property

		return result;
	}
	IntoObject(obj: any, options: VDFLoadOptions = null, path?: VDFNodePath): void {
		options = options || new VDFLoadOptions();
		path = path || new VDFNodePath(new VDFNodePathNode(obj));

		let typeName = VDF.GetTypeNameOfObject(obj);
		let typeGenericArgs = VDF.GetGenericArgumentsOfType(typeName);
		let typeInfo = VDFTypeInfo.Get(typeName);

		for (let propName in VDF.GetObjectProps(obj))
			if (obj[propName] instanceof Function && obj[propName].tags && obj[propName].tags.Any(a=> a instanceof VDFPreDeserialize))
				obj[propName](this, path, options);

		let deserializedByCustomMethod2 = false;
		for (let propName in VDF.GetObjectProps(obj))
			if (obj[propName] instanceof Function && obj[propName].tags && obj[propName].tags.Any(a=> a instanceof VDFDeserialize && !a.fromParent)) {
				let deserializeResult = obj[propName](this, path, options);
				if (deserializeResult !== undefined) {
					deserializedByCustomMethod2 = true;
					break;
				}
			}

		if (!deserializedByCustomMethod2) {
			for (let i = 0; i < this.listChildren.Count; i++) {
				//obj.Add(this.listChildren[i].ToObject(typeGenericArgs[0], options, path.ExtendAsListItem(i, this.listChildren[i])));
				let item = this.listChildren[i].ToObject(typeGenericArgs[0], options, path.ExtendAsListItem(i, this.listChildren[i]));
				if (obj.Count == i) // maybe temp; allow child to have already attached itself (by way of the VDF event methods)
					obj.Add(item);
            }
			for (let pair of this.mapChildren.Pairs)
				try {
					if (obj instanceof Dictionary) { //is IDictionary)
						/*let key = VDF.Deserialize("\"" + keyString + "\"", typeGenericArgs[0], options);
						//obj.Add(key, this.mapChildren[keyString].ToObject(typeGenericArgs[1], options, path.ExtendAsMapItem(key, null)));*/
						let key = pair.key.ToObject(typeGenericArgs[0], options, path.ExtendAsMapKey(pair.index, null));
						let value = pair.value.ToObject(typeGenericArgs[1], options, path.ExtendAsMapItem(key, null));
						obj.Set(key, value); // "obj" prop to be filled in at end of ToObject method // maybe temp; allow child to have already attached itself (by way of the VDF event methods)
					}
					else {
						//obj[keyString] = this.mapChildren[keyString].ToObject(typeInfo.props[keyString] && typeInfo.props[keyString].typeName, options, path.ExtendAsChild(typeInfo.props[keyString] || { name: keyString }, null));
						let propName = pair.key.primitiveValue;
						/*if (typeInfo.props[propName]) // maybe temp; just ignore props that are missing
						{*/

						let childPath = path.ExtendAsChild(typeInfo.props[propName] || {name: propName}, null);
						let value;
						for (let propName2 in VDF.GetObjectProps(obj))
							if (obj[propName2] instanceof Function && obj[propName2].tags && obj[propName2].tags.Any(a=>a instanceof VDFDeserializeProp)) {
								let deserializeResult = obj[propName2](pair.value, childPath, options);
								if (deserializeResult !== undefined) {
									value = deserializeResult;
									break;
								}
							}
						if (value === undefined)
							value = pair.value.ToObject(typeInfo.props[propName] && typeInfo.props[propName].typeName, options, childPath);
						obj[propName] = value;
					}
				}
				catch(ex) { ex.message += "\n==================\nRethrownAs) " + ("Error loading map-child with key '" + (typeof pair.key.primitiveValue == "string" ? "'" + pair.key.primitiveValue + "'" : "of type " + pair.key) + "'.") + "\n"; throw ex; }/**/finally{}
		}

		if (options.objPostDeserializeFuncs_early.ContainsKey(obj))
			for (let func of options.objPostDeserializeFuncs_early.Get(obj))
				func();

		for (let propName in VDF.GetObjectProps(obj))
			if(obj[propName] instanceof Function && obj[propName].tags && obj[propName].tags.Any(a=>a instanceof VDFPostDeserialize))
				obj[propName](this, path, options);

		if (options.objPostDeserializeFuncs.ContainsKey(obj))
			for (let func of options.objPostDeserializeFuncs.Get(obj))
				func();
	}
}
//VDFUtils.MakePropertiesHidden(VDFNode.prototype, true);

setTimeout(()=> {
	VDF.CancelSerialize = new VDFNode();
}, 0);