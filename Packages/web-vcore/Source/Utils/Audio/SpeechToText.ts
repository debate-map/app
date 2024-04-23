import {ToJSON} from "js-vextensions";

const SpeechRecognitionClass = window["SpeechRecognition"] || window["webkitSpeechRecognition"];

// Note that if the user checks "Desktop site", the user-agent will no longer contain "Android", breaking this detection.
export const inChromeAndroid = navigator.userAgent.includes("; Android ") && navigator.userAgent.includes(" Chrome/");

function RemoveDanglingSpaces(str: string) {
	return str.replace(/(^ | $)/g, "");
}

export class SpeechRecognizer {
	constructor(fixTranscriptBugIfPresent = true) {
	//constructor() {
		this.internalRecognizer = new SpeechRecognitionClass();
		this.internalRecognizer.continuous = true;
		this.internalRecognizer.interimResults = true;
		//this.internalRecognizer.lang = "en";

		this.internalRecognizer.addEventListener("start", this.OnStart);
		this.internalRecognizer.addEventListener("end", this.OnEnd);
		this.internalRecognizer.addEventListener("result", this.OnResult);

		if (fixTranscriptBugIfPresent && inChromeAndroid) this.fixTranscriptBug = true;

		// actually, it looks like the "transcript bug" might actually be the correct behavior (happens on Chrome Android and regular Chrome -- just didn't notice on regular because desktop lacked auto-stop bug)
		// if this is the case, then... todo: fix final-transcript stitching to match official behavior (without needing this fixTranscriptBug flag)
		// update: nvm, seems is not intended behavior
		//this.fixTranscriptBug = true;
	}

	internalRecognizer: any;
	recognizing = false;
	private userStopInProgress = false;
	onStartListeners = [] as (()=>any)[];
	private OnStart = ()=>{
		this.recognizing = true;
		this.onStartListeners.forEach(a=>a());
	}
	onEndListeners = [] as (()=>any)[];
	private OnEnd = ()=>{
		this.recognizing = false;

		// if this stop was unintended, and auto-restarts are allowed, restart recognizing
		if (!this.userStopInProgress && this.autoRestart) {
			this.StartRecognizing();
			// rather than wait for event, just say we're already recognizing again (prevents issue of an external on-end listener getting confused by "recognizing:false" when a split-second later it's started again)
			this.recognizing = true;
		}

		this.userStopInProgress = false;
		this.onEndListeners.forEach(a=>a());
	}

	OnResult = event=>{
		/*this.transcript_finalizedPortion = "";
		this.transcript_unfinalizedPortion = "";*/
		/*this.ClearTranscript();
		for (const result of event.results) {
			if (result.isFinal) {
				/*if (this.fixTranscriptBug) {
					this.transcript_finalizedPortion = result[0].transcript;
				} else {
					this.transcript_finalizedPortion += result[0].transcript;
				}*#/
				this.transcript_finalizedPortion += result[0].transcript;
			} else {
				this.transcript_unfinalizedPortion += result[0].transcript;
			}
		}
		this.transcript_finalizedPortion = this.transcript_finalizedPortion.replace(/\S/, m=>m.toUpperCase());*/

		const currentSession = this.transcriptSessions.Last();
		currentSession.currentSegments = [];
		for (const rawSegment of event.results) {
			const rawText = rawSegment[0].transcript;
			const text = RemoveDanglingSpaces(rawText);
			// if the raw-segment has spaces, and option is enabled, split each word into its own segment
			const segmentTexts = this.splitSegmentsWithSpaces ? text.split(" ") : [text];

			for (const subtext of segmentTexts) {
				let segment = new TranscriptSegment({session: currentSession, rawText, index: currentSession.currentSegments.length, text: subtext});
				const existingSegment = currentSession.allSegments[segment.Key];
				// if a segment already exists, use that
				if (existingSegment) {
					segment = existingSegment;
				} else {
					// else, set initial-time and add to allSegments
					segment.initialTime = Date.now();
					currentSession.allSegments[segment.Key] = segment;
				}

				// update isFinal and finalizedTime
				if (rawSegment.isFinal && !segment.isFinal) segment.finalizedTime = Date.now();
				segment.isFinal = rawSegment.isFinal;

				currentSession.currentSegments.push(segment);
			}
		}

		this.transcriptChangeListeners.forEach(a=>a());
	}
	transcriptChangeListeners = [] as (()=>any)[];

	// Chrome Desktop stops recognizing after ~30s of inactivity; Chrome Android stops after ~5s! So by default, auto-restart.
	autoRestart = true;
	// way to work around the Chrome Android bug of each entry in "event.results" containing the whole transcript up to its point
	fixTranscriptBug = false;
	splitSegmentsWithSpaces = true;

	transcriptSessions: TranscriptSession[] = [];
	GetSegments(finalizedSegments = true, unfinalizedSegments = true, ignoreUnfinalizedSegmentsYoungerThan = 0) {
		return this.transcriptSessions.SelectMany(session=>{
			let validSegments = session.currentSegments;
			if (this.fixTranscriptBug) {
				validSegments = [session.currentSegments.filter(a=>a.isFinal).LastOrX(), session.currentSegments.filter(a=>!a.isFinal).LastOrX()].filter(a=>a) as TranscriptSegment[];
			}
			const filteredSegments = validSegments.filter(segment=>{
				if (segment.isFinal) {
					if (!finalizedSegments) return false;
				}
				if (!segment.isFinal) {
					if (!unfinalizedSegments) return false;
					const age = Date.now() - segment.initialTime;
					if (age < ignoreUnfinalizedSegmentsYoungerThan) return false;
				}
				return true;
			});
			return filteredSegments;
		});
	}
	GetTranscript(finalizedSegments = true, unfinalizedSegments = true, ignoreUnfinalizedSegmentsYoungerThan = 0) {
		const segments = this.GetSegments(finalizedSegments, unfinalizedSegments, ignoreUnfinalizedSegmentsYoungerThan);
		/*return this.transcriptSessions.map(session=>{
			const sessionText = filteredSegments.map(segment=>RemoveDanglingSpaces(segment.text)).join(" ");
			return RemoveDanglingSpaces(sessionText);
		}).filter(a=>a.length).join(" ");*/
		const text = segments.map(segment=>RemoveDanglingSpaces(segment.text)).join(" ");
		return RemoveDanglingSpaces(text);
	}
	// to be called when owner has already retrieved the existing text/transcript, and wants to prepare for another recording
	ClearTranscript() {
		this.transcriptSessions.Clear();
	}

	StartRecognizing() {
		//if (clearTranscript) this.ClearTranscript();

		this.transcriptSessions.push(new TranscriptSession());
		this.internalRecognizer.start();
	}
	async StopRecognizing() {
		// todo: make so this insta-resolves if recording never started in the first place (eg. when on non-https domain)
		return new Promise<void>((resolve, reject)=>{
			this.userStopInProgress = true;
			const onEndListener = ()=>{
				resolve();
				this.onEndListeners.Remove(onEndListener);
			};
			this.onEndListeners.push(onEndListener);
			this.internalRecognizer.stop();
		});
	}
}

export class TranscriptSession {
	allSegments = {} as {[key: string]: TranscriptSegment};
	currentSegments: TranscriptSegment[] = [];
}
export class TranscriptSegment {
	constructor(initialData: Partial<TranscriptSegment>) {
		this.Extend(initialData);
	}
	session: TranscriptSession;
	rawText: string;

	// fields contributing to segment-key
	index: number;
	text: string;
	get Key() {
		return ToJSON({index: this.index, text: this.text.toLowerCase()});
	}

	initialTime: number;
	isFinal: boolean;
	finalizedTime: number;
}