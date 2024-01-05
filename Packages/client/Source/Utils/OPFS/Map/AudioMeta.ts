export class AudioMeta {
	static GetOrCreateFileMeta(audioMeta: AudioMeta, fileName: string) {
		if (audioMeta.fileMetas[fileName] == null) {
			audioMeta.fileMetas[fileName] = new AudioFileMeta();
		}
		return audioMeta.fileMetas[fileName];
	}

	fileMetas = {} as {[key: string]: AudioFileMeta};
}
export class AudioFileMeta {
	stepStartTimes = {} as {[key: string]: number}
}