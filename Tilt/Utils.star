def ReplaceInBlob(fileBlob, replacements):
	blobAsStr = str(fileBlob)
	for key, value in replacements.items():
		blobAsStr_old = blobAsStr

		op_useBase64 = "[@base64]" in key
		if op_useBase64:
			key_final = Base64Encode(key.replace("[@base64]", ""))
			value_final = Base64Encode(value)
			print("Replacing: " + key_final + " with " + value_final + "")
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

def ModifyLineRange(string, startMarker, endMarker, action):
	lines = string.split("\n")
	lines_new = []
	inBlock = False
	for line in lines:
		if startMarker in line:
			inBlock = True
			# always keep the marker lines (so can chain them)
			lines_new.append(line)
			continue
		if endMarker in line:
			inBlock = False
			# always keep the marker lines (so can chain them)
			lines_new.append(line)
			continue

		if inBlock:
			if action == "omit":
				#print("Omitting line:" + line)
				pass
			elif action == "reduceIndent":
				lines_new.append(line[2:]) # each "indent" is 2 spaces
			else:
				fail("Error: ModifyLineRange was called, but action is invalid: " + action)
		else:
			lines_new.append(line)
	return "\n".join(lines_new)

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