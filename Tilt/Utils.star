def ReplaceInBlob(fileBlob, replacements):
	blobAsStr = str(fileBlob)
	for key, value in replacements.items():
		blobAsStr_old = blobAsStr

		op_useBase64 = "[@base64]" in key
		if op_useBase64:
			key_final = Base64Encode(key.replace("[@base64]", ""))
			value_final = Base64Encode(value)
			blobAsStr = blobAsStr.replace(key_final, value_final)
		else:
			blobAsStr = blobAsStr.replace(key, value)

		if blobAsStr == blobAsStr_old:
			fail("Error: ReplaceInBlob was called, but key not found in file: " + key)
	return blob(blobAsStr)
def ReadFileWithReplacements(filePath, replacements):
	fileBlob = read_file(filePath)
	fileBlob = ReplaceInBlob(fileBlob, replacements)
	return fileBlob

def ModifyLineRange(inputStr, startMarker, endMarker, action, mustFind=True):
	lines = inputStr.split("\n")
	lines_new = []
	foundStartMarker = False
	foundEndMarker = False

	inBlock = False
	for line in lines:
		#print("line:", line)
		if startMarker in line:
			inBlock = True
			foundStartMarker = True
			# always keep the marker lines (so can chain them)
			lines_new.append(line)
			continue
		if endMarker in line:
			inBlock = False
			foundEndMarker = True
			# always keep the marker lines (so can chain them)
			lines_new.append(line)
			continue

		if inBlock:
			if action == "omit":
				#print("Omitting line:" + line)
				pass
			elif action == "reduceIndent":
				lines_new.append(line[2:]) # each "indent" is 2 spaces
			elif action == "keep":
				lines_new.append(line) # just keep line as-is
			else:
				fail("Error: ModifyLineRange was called, but action is invalid: " + action)
		else:
			lines_new.append(line)
	if mustFind and (not foundStartMarker or not foundEndMarker):
		fail("Error: ModifyLineRange was called, but start-marker or end-marker not found! @startMarker:{}{} @endMarker:{}{}".format(
			startMarker, "" if foundStartMarker else "[not found]",
			endMarker, "" if foundEndMarker else "[not found]"
		))
	return "\n".join(lines_new)

# this is sort of an alternative to "ModifyLineRange", which works more conveniently in helm-processed "values.yaml" files (mainly: this approach survives helm's reordering of keys)
def ApplyKeyBasedExclusions(inputStr, flags):
	objects = decode_yaml_stream(inputStr)
	for i, obj in enumerate(objects):
		#print("obj:", obj, type(obj))
		objects[i] = ApplyKeyBasedExclusions_OnObj(obj, flags)
	return str(encode_yaml_stream(objects))
signifierToExcludeSelf = {"___EXCLUDE_SELF___": True}
def ApplyKeyBasedExclusions_OnObj(inputObj, flags):
	#if type(inputObj) == dict:
	if str(type(inputObj)) == "dict":
		return ApplyKeyBasedExclusions_OnMap(inputObj, flags)
	elif str(type(inputObj)) == "list":
		return ApplyKeyBasedExclusions_OnList(inputObj, flags)
	return inputObj
def ApplyKeyBasedExclusions_OnMap(inputMap, flags):
	for key, value in inputMap.items():
		# first, recurse into the object itself to apply exclusions at lower levels
		value = ApplyKeyBasedExclusions_OnObj(value, flags)
		if value == signifierToExcludeSelf:
			inputMap.pop(key)
			continue
		inputMap[key] = value

		#print("key:", key)

		if "___INCLUDE_IF_" in key:
			realKey, flag = key.split("___INCLUDE_IF_")
			if flag not in flags:
				fail("Encountered an unknown flag for key-based exclusions: " + flag)
			# always remove the overloaded key
			inputMap.pop(key)
			# but then add the property back (under the real key) IF the specified condition is met
			if flags[flag]:
				inputMap[realKey] = value
			else:
				print("--- Excluding property. KEY={} FLAG={}:{} VALUE={}".format(realKey, flag, flags[flag], value))

		if "___INCLUDE_PARENT_IF_" in key:
			_, flag = key.split("___INCLUDE_PARENT_IF_")
			if flag not in flags:
				fail("Encountered an unknown flag for key-based exclusions: " + flag)
			# always remove the overloaded key
			inputMap.pop(key)
			# and if condition was not met, remove the parent object as well
			if not flags[flag]:
				print("--- Excluding parent. FLAG={}:{} VALUE={}".format(flag, flags[flag], inputMap))
				return signifierToExcludeSelf

	return inputMap
def ApplyKeyBasedExclusions_OnList(inputList, flags):
	for i in range(len(inputList)):
		inputList[i] = ApplyKeyBasedExclusions_OnObj(inputList[i], flags)
		if inputList[i] == signifierToExcludeSelf:
			inputList.pop(i)
	return inputList

def Base64Encode(strToEncode):
	#return strToEncode.encode("utf-8").base64encode().decode("utf-8")
	if "'" in strToEncode:
		fail("Error: base64encode was called, but string contains single-quotes: " + strToEncode)
	jsCode = "process.stdout.write(Buffer.from(`" + strToEncode + "`).toString(`base64`).slice(0, -2))"
	result_blob = local(["node", "-e", jsCode], echo_off=True, quiet=True)
	return str(result_blob)

def GetDateTime():
	jsCode = "process.stdout.write(new Date().toLocaleString('sv'))"
	result_blob = local(["node", "-e", jsCode], echo_off=True, quiet=True)
	return str(result_blob)