import {wavFile_headerSize} from "Utils/Bridge/VoiceChanger/AudioSender";
import {CreateAsyncAccessor} from "mobx-graphlink";

export const ReadFileText = CreateAsyncAccessor(async(file: File)=>{
	return await file.text();
});
export const ReadFileText_AsJSON = CreateAsyncAccessor(async(file: File)=>{
	const json = await file.text();
	return JSON.parse(json);
});

// note: this function assumes some things about the WAV file (these assumptions are based on the conversion pipeline from the voice-changer app; see AudioSender.ts)
export const GetDurationOfWAVAudioFile = CreateAsyncAccessor(async(audioFile: File)=>{
	// the chunk containing the actual samples is an int16 array (AudioSender.ts calls `FloatTo16BitPCM` for inserting the samples into the buffer)
	const bytesPerSample_singleChannel = Uint16Array.BYTES_PER_ELEMENT;
	const numChannels = 1;
	const bytesPerSample_allChannels = bytesPerSample_singleChannel * numChannels;
	const sampleRate = 48000;

	const buffer = await audioFile.arrayBuffer();
	const nonHeaderBytesInFile = buffer.byteLength - wavFile_headerSize;

	const totalSamples = nonHeaderBytesInFile / bytesPerSample_allChannels;
	return totalSamples / sampleRate;
});