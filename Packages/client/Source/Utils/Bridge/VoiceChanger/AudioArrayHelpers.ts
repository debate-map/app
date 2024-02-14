export function ArrayBufferToBase64(buffer: ArrayBuffer) {
	var binary = "";
	var bytes = new Uint8Array(buffer);
	var len = bytes.byteLength;
	for (var i = 0; i < len; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return window.btoa(binary);
}
export function Base64ToArrayBuffer(base64: string) {
	var binary_string = window.atob(base64);
	var len = binary_string.length;
	var bytes = new Uint8Array(len);
	for (var i = 0; i < len; i++) {
		bytes[i] = binary_string.charCodeAt(i);
	}
	return bytes.buffer;
}

export function FloatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
	for (var i = 0; i < input.length; i++, offset += 2) {
		var s = Math.max(-1, Math.min(1, input[i]));
		output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
	}
}
export function Float32ArrayToInt16Array(data: Float32Array, offset = 0) {
	const buffer = new ArrayBuffer(offset + (data.length * 2));
	const view = new DataView(buffer);
	FloatTo16BitPCM(view, offset, data); // 波形データ
	return buffer;
}
export function Int16ArrayToFloat32Array(i16Data: Int16Array) {
	const f32Data = new Float32Array(i16Data.length);
	i16Data.forEach((x, i)=>{
		const float = x >= 0x8000 ? -(0x10000 - x) / 0x8000 : x / 0x7fff;
		f32Data[i] = float;
	});
	return f32Data;
}

export function FlattenFloat32Arrays(chunks: Float32Array[]) {
	const nFrames = chunks.reduce((acc, elem)=>acc + elem.length, 0);
	const result = new Float32Array(nFrames);
	let currentFrame = 0;
	for (const chunk of chunks) {
		result.set(chunk, currentFrame);
		currentFrame += chunk.length;
	}
	return result;
}