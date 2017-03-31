import {VDFNode} from "./VDFNode";
import {VDFToken, VDFTokenParser, VDFTokenType} from "./VDFTokenParser";
import {VDFTypeInfo} from "./VDFTypeInfo";
import {Dictionary, List} from "./VDFExtras";
import {VDF} from "./VDF";

export class VDFLoadOptions {
	constructor(initializerObj?: any, messages?: any[], allowStringKeys = true, allowCommaSeparators = false, loadUnknownTypesAsBasicTypes = false) {
		this.messages = messages || [];
		this.allowStringKeys = allowStringKeys;
		this.allowCommaSeparators = allowCommaSeparators;
		this.loadUnknownTypesAsBasicTypes = loadUnknownTypesAsBasicTypes;

		if (initializerObj)
			for (var key in initializerObj)
				this[key] = initializerObj[key];
	}

	messages: any[];
	objPostDeserializeFuncs_early = new Dictionary<Object, List<Function>>("object", "List(Function)");
	objPostDeserializeFuncs = new Dictionary<Object, List<Function>>("object", "List(Function)");
	AddObjPostDeserializeFunc(obj, func: Function, early = false) {
		if (early) {
			if (!this.objPostDeserializeFuncs_early.ContainsKey(obj))
				this.objPostDeserializeFuncs_early.Add(obj, new List<Function>("Function"));
			this.objPostDeserializeFuncs_early.Get(obj).Add(func);
		}
		else {
			if (!this.objPostDeserializeFuncs.ContainsKey(obj))
				this.objPostDeserializeFuncs.Add(obj, new List<Function>("Function"));
			this.objPostDeserializeFuncs.Get(obj).Add(func);
		}
	}

	loadUnknownTypesAsBasicTypes: boolean;

	// for JSON compatibility
	allowStringKeys: boolean;
	allowCommaSeparators: boolean;

	ForJSON() { // helper function for JSON compatibility
		this.allowStringKeys = true;
		this.allowCommaSeparators = true;
		return this;
	}
}

export class VDFLoader {
	static ToVDFNode(text: string, options: VDFLoadOptions): VDFNode;
	static ToVDFNode(text: string, declaredTypeName?: string, options?: VDFLoadOptions): VDFNode;
	static ToVDFNode(text: List<VDFToken>, options: VDFLoadOptions): VDFNode;
	static ToVDFNode(text: List<VDFToken>, declaredTypeName?: string, options?: VDFLoadOptions, firstTokenIndex?: number, enderTokenIndex?: number): VDFNode;
	static ToVDFNode(tokens_orText: any, declaredTypeName_orOptions?: any, options?: VDFLoadOptions, firstTokenIndex = 0, enderTokenIndex = -1): VDFNode {
		if (declaredTypeName_orOptions instanceof VDFLoadOptions)
			return VDFLoader.ToVDFNode(tokens_orText, null, declaredTypeName_orOptions);
		if (typeof tokens_orText == "string")
			return VDFLoader.ToVDFNode(VDFTokenParser.ParseTokens(tokens_orText, options), declaredTypeName_orOptions, options);

		var tokens: List<VDFToken> = tokens_orText;
		var declaredTypeName: string = declaredTypeName_orOptions;
		options = options || new VDFLoadOptions();
		enderTokenIndex = enderTokenIndex != -1 ? enderTokenIndex : tokens.Count;

		// figure out obj-type
		// ==========

		var depth = 0;
		var tokensAtDepth0 = new List<VDFToken>("VDFToken");
		var tokensAtDepth1 = new List<VDFToken>("VDFToken");
		var i: number;
		for (var i = firstTokenIndex; i < enderTokenIndex; i++) {
			var token = tokens[i];
			if (token.type == VDFTokenType.ListEndMarker || token.type == VDFTokenType.MapEndMarker)
				depth--;
			if (depth == 0)
				tokensAtDepth0.Add(token);
			if (depth == 1)
				tokensAtDepth1.Add(token);
			if (token.type == VDFTokenType.ListStartMarker || token.type == VDFTokenType.MapStartMarker)
				depth++;
		}

		var fromVDFTypeName = "object";
		var firstNonMetadataToken = tokensAtDepth0.First(a=>a.type != VDFTokenType.Metadata);
		if (tokensAtDepth0[0].type == VDFTokenType.Metadata)
			fromVDFTypeName = tokensAtDepth0[0].text;
		else if (firstNonMetadataToken.type == VDFTokenType.Boolean)
			fromVDFTypeName = "bool";
		else if (firstNonMetadataToken.type == VDFTokenType.Number)
			fromVDFTypeName = firstNonMetadataToken.text == "Infinity" || firstNonMetadataToken.text == "-Infinity" || firstNonMetadataToken.text.Contains(".") || firstNonMetadataToken.text.Contains("e") ? "double" : "int";
		else if (firstNonMetadataToken.type == VDFTokenType.String)
			fromVDFTypeName = "string";
		else if (firstNonMetadataToken.type == VDFTokenType.ListStartMarker)
			fromVDFTypeName = "List(object)";
		else if (firstNonMetadataToken.type == VDFTokenType.MapStartMarker)
			fromVDFTypeName = "Dictionary(object object)"; //"object";

		var typeName = declaredTypeName;
		if (fromVDFTypeName != null && fromVDFTypeName.length > 0) {
			// porting-note: this is only a limited implementation of CS functionality of making sure from-vdf-type is more specific than declared-type
			if (typeName == null || ["object", "IList", "IDictionary"].Contains(typeName)) // if there is no declared type, or the from-metadata type is more specific than the declared type (i.e. declared type is most basic type 'object')
				typeName = fromVDFTypeName;
		}
		// for keys, force load as string, since we're not at the use-importer stage
		if (firstNonMetadataToken.type == VDFTokenType.Key)
			typeName = "string";
		var typeGenericArgs = VDF.GetGenericArgumentsOfType(typeName);
		var typeInfo = VDFTypeInfo.Get(typeName);

		// create the object's VDFNode, and load in the data
		// ==========

		var node = new VDFNode();
		node.metadata = tokensAtDepth0[0].type == VDFTokenType.Metadata ? fromVDFTypeName : null;
		
		// if primitive, parse value
		if (firstNonMetadataToken.type == VDFTokenType.Null)
			node.primitiveValue = null;
		else if (typeName == "bool")
			node.primitiveValue = firstNonMetadataToken.text == "true" ? true : false;
		else if (typeName == "int")
			node.primitiveValue = parseInt(firstNonMetadataToken.text);
		else if (typeName == "float" || typeName == "double" || firstNonMetadataToken.type == VDFTokenType.Number)
			node.primitiveValue = parseFloat(firstNonMetadataToken.text);
		//else if (typeName == "string")
		// have in-vdf string type override declared type, since we're not at the use-importer stage
		else if (typeName == "string" || firstNonMetadataToken.type == VDFTokenType.String)
			node.primitiveValue = firstNonMetadataToken.text;

		// if list, parse items
		//else if (firstNonMetadataToken.type == VDFTokenType.ListStartMarker)
		else if (typeName.StartsWith("List(")) {
			node.isList = true;
			for (var i = 0; i < tokensAtDepth1.Count; i++) {
				var token = tokensAtDepth1[i];
				if (token.type != VDFTokenType.ListEndMarker && token.type != VDFTokenType.MapEndMarker) {
					var itemFirstToken = tokens[token.index];
					var itemEnderToken = tokensAtDepth1.FirstOrX(a=>a.index > itemFirstToken.index + (itemFirstToken.type == VDFTokenType.Metadata ? 1 : 0) && token.type != VDFTokenType.ListEndMarker && token.type != VDFTokenType.MapEndMarker);
					//node.AddListChild(VDFLoader.ToVDFNode(VDFLoader.GetTokenRange_Tokens(tokens, itemFirstToken, itemEnderToken), typeGenericArgs[0], options));
					node.AddListChild(VDFLoader.ToVDFNode(tokens, typeGenericArgs[0], options, itemFirstToken.index, itemEnderToken != null ? itemEnderToken.index : enderTokenIndex));
					if (itemFirstToken.type == VDFTokenType.Metadata) // if item had metadata, skip an extra token (since it had two non-end tokens)
						i++;
				}
			}
		}

		// if not primitive and not list (i.e. map/object/dictionary), parse pairs/properties
		//else //if (firstNonMetadataToken.type == VDFTokenType.MapStartMarker)
		else { //if (typeName.StartsWith("Dictionary("))
			node.isMap = true;
			for (var i = 0; i < tokensAtDepth1.Count; i++) {
				var token = tokensAtDepth1[i];
				if (token.type == VDFTokenType.Key) {
					var propNameFirstToken = i >= 1 && tokensAtDepth1[i - 1].type == VDFTokenType.Metadata ? tokensAtDepth1[i - 1] : tokensAtDepth1[i];
					var propNameEnderToken = tokensAtDepth1[i + 1];
					var propNameType = propNameFirstToken.type == VDFTokenType.Metadata ? "object" : "string";
					if (typeName.StartsWith("Dictionary(") && typeGenericArgs[0] != "object")
						propNameType = typeGenericArgs[0];
					var propNameNode = VDFLoader.ToVDFNode(tokens, propNameType, options, propNameFirstToken.index, propNameEnderToken.index);

					var propValueType;
					//if (typeName.StartsWith("Dictionary(")) //typeof(IDictionary).IsAssignableFrom(objType))
					if (typeGenericArgs.length >= 2)
						propValueType = typeGenericArgs[1];
					else
						//propValueTypeName = typeInfo && typeInfo.props[propName] ? typeInfo.props[propName].typeName : null;
						propValueType = typeof propNameNode.primitiveValue == "string" && typeInfo && typeInfo.props[propNameNode.primitiveValue] ? typeInfo.props[propNameNode.primitiveValue].typeName : null;

					var propValueFirstToken = tokensAtDepth1[i + 1];
					var propValueEnderToken = tokensAtDepth1.FirstOrX(a=>a.index > propValueFirstToken.index && a.type == VDFTokenType.Key);
					//var propValueNode = VDFLoader.ToVDFNode(VDFLoader.GetTokenRange_Tokens(tokens, propValueFirstToken, propValueEnderToken), propValueTypeName, options);
					var propValueNode = VDFLoader.ToVDFNode(tokens, propValueType, options, propValueFirstToken.index, propValueEnderToken != null ? propValueEnderToken.index : enderTokenIndex);

					node.SetMapChild(propNameNode, propValueNode);
				}
			}
		}

		return node;
	}
	/*static GetTokenRange_Tokens(tokens: List<VDFToken>, firstToken: VDFToken, enderToken: VDFToken): List<VDFToken> {
		//return tokens.GetRange(firstToken.index, (enderToken != null ? enderToken.index : tokens.Count) - firstToken.index).Select(a=>new VDFToken(a.type, a.position - firstToken.position, a.index - firstToken.index, a.text)).ToList();

		var result = new List<VDFToken>("VDFToken");
		for (var i = firstToken.index; i < (enderToken != null ? enderToken.index : tokens.Count); i++)
			result.Add(new VDFToken(tokens[i].type, tokens[i].position - firstToken.position, tokens[i].index - firstToken.index, tokens[i].text));
		return result;
	}*/
}