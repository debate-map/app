import {Dictionary, EnumValue, List, VDFNodePath, VDFNodePathNode} from "./VDFExtras";
import {Assert, VDF} from "./VDF";
import {VDFNode} from "./VDFNode";
import {
    VDFPostSerialize,
    VDFPreSerialize,
    VDFPropInfo,
    VDFSerialize,
    VDFSerializeProp,
    VDFTypeInfo
} from "./VDFTypeInfo";
export enum VDFTypeMarking {
	None,
	Internal,
	External,
	ExternalNoCollapse // maybe temp
}
export class VDFSaveOptions {
	constructor(initializerObj?: any, messages?: any[], typeMarking = VDFTypeMarking.Internal,
		useMetadata = true, useChildPopOut = true, useStringKeys = false, useNumberTrimming = true, useCommaSeparators = false
	) {
		this.messages = messages || [];
		this.typeMarking = typeMarking;
		this.useMetadata = useMetadata;
		this.useChildPopOut = useChildPopOut;
		this.useStringKeys = useStringKeys;
		this.useNumberTrimming = useNumberTrimming;
		this.useCommaSeparators = useCommaSeparators;

		if (initializerObj)
			for (var key in initializerObj)
				this[key] = initializerObj[key];
	}

	messages: any[];
	typeMarking: VDFTypeMarking;

	// for JSON compatibility
	useMetadata: boolean;
	useChildPopOut: boolean;
	useStringKeys: boolean;
	useNumberTrimming: boolean; // e.g. trims 0.123 to .123
	useCommaSeparators: boolean; // currently only applies to non-popped-out children

	ForJSON(): VDFSaveOptions { // helper function for JSON compatibility
		this.useMetadata = false;
		this.useChildPopOut = false;
		this.useStringKeys = true;
		this.useNumberTrimming = false;
		this.useCommaSeparators = true;
		return this;
	}
}

export class VDFSaver {
	static ToVDFNode(obj: any, options?: VDFSaveOptions): VDFNode;
	static ToVDFNode(obj: any, declaredTypeName?: string, options?: VDFSaveOptions, path?: VDFNodePath, declaredTypeFromParent?: boolean): VDFNode;
	static ToVDFNode(obj: any, declaredTypeName_orOptions?: any, options = new VDFSaveOptions(), path?: VDFNodePath, declaredTypeInParentVDF?: boolean): VDFNode {
		if (declaredTypeName_orOptions instanceof VDFSaveOptions)
			return VDFSaver.ToVDFNode(obj, null, declaredTypeName_orOptions);

		let declaredTypeName: string = declaredTypeName_orOptions;

		path = path || new VDFNodePath(new VDFNodePathNode(obj));

		let typeName = obj != null ? (EnumValue.IsEnum(declaredTypeName) ? declaredTypeName : VDF.GetTypeNameOfObject(obj)) : null; // at bottom, enums an integer; but consider it of a distinct type
		let typeGenericArgs = VDF.GetGenericArgumentsOfType(typeName);
		let typeInfo = typeName ? VDFTypeInfo.Get(typeName) : new VDFTypeInfo();

		for (let propName in VDF.GetObjectProps(obj))
			if (obj[propName] instanceof Function && obj[propName].tags && obj[propName].tags.Any(a=> a instanceof VDFPreSerialize)) {
				if (obj[propName](path, options) == VDF.CancelSerialize)
					return VDF.CancelSerialize;
			}

		let result;
		let serializedByCustomMethod = false;
		for (let propName in VDF.GetObjectProps(obj))
			if (obj[propName] instanceof Function && obj[propName].tags && obj[propName].tags.Any(a=> a instanceof VDFSerialize)) {
				let serializeResult = obj[propName](path, options);
				if (serializeResult !== undefined) {
					result = serializeResult;
					serializedByCustomMethod = true;
					break;
				}
			}

		if (!serializedByCustomMethod) {
			result = new VDFNode();
			if (obj == null) {} //result.primitiveValue = null;
			else if (VDF.GetIsTypePrimitive(typeName))
				result.primitiveValue = obj;
			else if (EnumValue.IsEnum(typeName)) // helper exporter for enums (at bottom, TypeScript enums are numbers; but we can get the nice-name based on type info)
				result.primitiveValue = new EnumValue(typeName, obj).toString();
			else if (typeName && typeName.StartsWith("List(")) {
				result.isList = true;
				let objAsList = <List<any>>obj;
				for (let i = 0; i < objAsList.length; i++) {
					let itemNode = VDFSaver.ToVDFNode(objAsList[i], typeGenericArgs[0], options, path.ExtendAsListItem(i, objAsList[i]), true);
					if (itemNode == VDF.CancelSerialize) continue;
					result.AddListChild(itemNode);
				}
			}
			else if (typeName && typeName.StartsWith("Dictionary(")) {
				result.isMap = true;
				let objAsDictionary = <Dictionary<any, any>>obj;
				for (let i = 0, pair = null, pairs = objAsDictionary.Pairs; i < pairs.length && (pair = pairs[i]); i++) {
                    let keyNode = VDFSaver.ToVDFNode(pair.key, typeGenericArgs[0], options, path.ExtendAsMapKey(i, pair.key), true); // stringify-attempt-1: use exporter
					if (typeof keyNode.primitiveValue != "string") // if stringify-attempt-1 failed (i.e. exporter did not return string), use stringify-attempt-2
						//throw new Error("A map key object must either be a string or have an exporter that converts it into a string.");
						keyNode = new VDFNode(pair.key.toString());
					let valueNode = VDFSaver.ToVDFNode(pair.value, typeGenericArgs[1], options, path.ExtendAsMapItem(pair.key, pair.value), true);
					if (valueNode == VDF.CancelSerialize) continue;
					result.SetMapChild(keyNode, valueNode);
				}
			}
			else { // if an object, with properties
				result.isMap = true;

				Assert(typeInfo, `Could not find type-info for type. @TypeName(${typeName})`);

				// special fix; we need to write something for each declared prop (of those included anyway), so insert empty props for those not even existent on the instance
				for (let propName in typeInfo.props) {
					if (!(propName in obj))
						obj[propName] = null;
				}

				for (let propName in obj) {
					try {
						let propInfo: VDFPropInfo = typeInfo.props[propName]; // || new VDFPropInfo("object"); // if prop-info not specified, consider its declared-type to be 'object'
						/*let include = typeInfo.typeTag != null && typeInfo.typeTag.propIncludeRegexL1 != null ? new RegExp(typeInfo.typeTag.propIncludeRegexL1).test(propName) : false;
						include = propInfo && propInfo.propTag && propInfo.propTag.includeL2 != null ? propInfo.propTag.includeL2 : include;*/
						let include = propInfo && propInfo.propTag && propInfo.propTag.includeL2 != null ? propInfo.propTag.includeL2 : (
							typeInfo.typeTag != null && typeInfo.typeTag.propIncludeRegexL1 != null && new RegExp(typeInfo.typeTag.propIncludeRegexL1).test(propName)
						);
						if (!include) continue;

						let propValue = obj[propName];
						// maybe temp; fix for ts derived-class constructors
						if (propName == "constructor" && propValue instanceof Function) continue;
						if (propInfo && !propInfo.ShouldValueBeSaved(propValue)) continue;

						let propNameNode = new VDFNode(propName);
						let propValueNode;

						let childPath = path.ExtendAsChild(propInfo, propValue);
						for (let propName2 in VDF.GetObjectProps(obj))
							if (obj[propName2] instanceof Function && obj[propName2].tags && obj[propName2].tags.Any(a=>a instanceof VDFSerializeProp)) {
								let serializeResult = obj[propName2](childPath, options);
								if (serializeResult !== undefined) {
									propValueNode = serializeResult;
									break;
								}
							}
						if (propValueNode === undefined)
							propValueNode = VDFSaver.ToVDFNode(propValue, propInfo ? propInfo.typeName : null, options, childPath);
						if (propValueNode == VDF.CancelSerialize) continue;

						propValueNode.childPopOut = options.useChildPopOut && (propInfo && propInfo.propTag && propInfo.propTag.popOutL2 != null ? propInfo.propTag.popOutL2 : propValueNode.childPopOut);
						result.SetMapChild(propNameNode, propValueNode);
					}
					catch (ex) { ex.message += "\n==================\nRethrownAs) " + ("Error saving property '" + propName + "'.") + "\n"; throw ex; }/**/finally{}
				}
			}
		}

		if (declaredTypeName == null)
			if (result.isList || result.listChildren.Count > 0)
				declaredTypeName = "List(object)";
			else if (result.isMap || result.mapChildren.Count > 0)
				declaredTypeName = "Dictionary(object object)";
			else
				declaredTypeName = "object";
		if (options.useMetadata && typeName != null && !VDF.GetIsTypeAnonymous(typeName) && (
			(options.typeMarking == VDFTypeMarking.Internal && !VDF.GetIsTypePrimitive(typeName) && typeName != declaredTypeName)
			|| (options.typeMarking == VDFTypeMarking.External && !VDF.GetIsTypePrimitive(typeName) && (typeName != declaredTypeName || !declaredTypeInParentVDF))
			|| options.typeMarking == VDFTypeMarking.ExternalNoCollapse
		))
			result.metadata = typeName;

		if (result.metadata_override != null)
			result.metadata = result.metadata_override;

		if (options.useChildPopOut && typeInfo && typeInfo.typeTag && typeInfo.typeTag.popOutL1)
			result.childPopOut = true;

		for (var propName in VDF.GetObjectProps(obj))
			if(obj[propName] instanceof Function && obj[propName].tags && obj[propName].tags.Any(a=>a instanceof VDFPostSerialize))
				obj[propName](result, path, options);

		return result;
	}
}