import {Timer, Assert, CE, ObjectCE, E, AssertWarn} from "js-vextensions";
import {manager} from "../../Manager.js";
import {g} from "../../PrivateExports.js";

export let youtubeAPILoadStarted = false;
export let youtubeAPIReady = false;
export const onYoutubeAPIReadyListeners = [] as Function[];
g.onYouTubeIframeAPIReady = ()=>{
	youtubeAPIReady = true;
	console.log("Youtube API ready.");
	onYoutubeAPIReadyListeners.forEach(a=>a());
};

export function EnsureYoutubeAPIReady() {
	return new Promise<void>((resolve, reject)=>{
		if (youtubeAPIReady) {
			resolve();
		} else {
			// if youtube-api loading hasn't started yet, start loading youtube API
			if (!youtubeAPILoadStarted) {
				document.head.appendChild(ObjectCE(document.createElement("script")).VSet({src: "https://www.youtube.com/iframe_api"}));
				youtubeAPILoadStarted = true;
			}

			onYoutubeAPIReadyListeners.push(resolve);
		}
	});
}

export enum YoutubePlayerState {
	/** Means "we're about to play a new file". */
	UNSTARTED = -1,
	ENDED = 0,
	PLAYING = 1,
	PAUSED = 2,
	BUFFERING = 3,
	CUED = 5,
}

export enum YoutubeQuality {
	default = 10,
	small = 20,
	medium = 30,
	large = 40,
	hd720 = 50,
	hd1080 = 60,
	highres = 70,
}
export enum YoutubeSpeed {
	"25%" = .25,
	"50%" = .5,
	"75%" = .75,
	"100%" = 1,
	"125%" = 1.25,
	"150%" = 1.5,
	"200%" = 2,
}

export const YoutubeClipInfo_props = ["videoID", "startTime", "endTime", "quality"];
export type YoutubeClipInfo = {
	videoID: string;
	startTime?: number;
	endTime?: number;
	quality?: YoutubeQuality;
};

export type YoutubePlayer_ReadyListener = ()=>void;
export type YoutubePlayer_StateListener = (state: YoutubePlayerState, removeListener: ()=>void)=>void;
export type PosChangeSource = "playback" | "setPosition";

export class YoutubePlayer {
	static lastID = -1;

	constructor(name?: string) {
		this.id = ++YoutubePlayer.lastID;
		this.name = name;
		youtubePlayers.push(this);
	}

	id: number;
	name: string|n;
	hasOwner = true;
	//Disown() { this.hasOwner = false; }
	internalPlayer: any;

	// ui stuff
	containerUI: HTMLElement;
	private playerUI: HTMLIFrameElement;
	GetPlayerUI() { return this.playerUI; }
	uiWidth: number | string = "100%";
	uiHeight: number | string = "100%";
	playerConfig: any;

	ready = false;
	readyListeners = [] as YoutubePlayer_ReadyListener[];
	AssertReady() {
		Assert(this.internalPlayer && this.ready, "Must first call, and await completion of, the asynchronous player.EnsureReady().");
	}
	EnsureReady() {
		return new Promise<void>(async(resolve, reject)=>{
			if (this.ready) resolve();
			this.readyListeners.push(resolve);

			if (this.internalPlayer == null) {
				await EnsureYoutubeAPIReady();

				//const playersHolder = document.querySelector("#youtube-players");
				this.containerUI = this.containerUI ?? manager.GetYoutubePlayerPoolContainer!(); // if func needed, but user left null, they'll see error here
				const newPlayerDiv = document.createElement("div");
				newPlayerDiv.id = `youtube-player-${this.id}`;
				this.containerUI.appendChild(newPlayerDiv);

				this.internalPlayer = new g.YT.Player(
					newPlayerDiv.id,
					E(this.playerConfig, {
						width: this.uiWidth,
						height: this.uiHeight,
						events: {
							onReady: ()=>{
								this.ready = true;
								this.readyListeners.forEach(a=>a());
							},
							onStateChange: e=>this.OnStateChange(e),
						},
					}),
				);

				this.playerUI = document.getElementById(newPlayerDiv.id) as HTMLIFrameElement; // get iframe that replaced the div
			}
		});
	}

	state: YoutubePlayerState;
	stateListeners = [] as YoutubePlayer_StateListener[];
	AddStateListener(listener: YoutubePlayer_StateListener) { this.stateListeners.push(listener); }
	RemoveStateListener(listener: YoutubePlayer_StateListener) { this.stateListeners.Remove(listener); }
	OnStateChange({data: state}: {data: YoutubePlayerState}) {
		this.state = state;
		//Log(`[${this.id}${this.name ? `, ${this.name}` : ""}] State: ${YoutubePlayerState[state]}`);
		for (const listener of this.stateListeners) {
			listener(state, ()=>this.RemoveStateListener(listener));
		}

		if (state == YoutubePlayerState.PLAYING) {
			this.positionUpdateTimer.Start();
		} else {
			this.positionUpdateTimer.Stop();
			this.NotifyCurrentPosChanged(this.internalPlayer.getCurrentTime(), "playback"); // update one last time

			// if ended naturally (reached end of video), possibly clear buffer (depending on youtube-buffered-players setting)
			if (state == YoutubePlayerState.ENDED) {
				this.OnEndReached();
			}
		}
	}

	UpdateCurrentPos_triggerOnPosChangeEvenIfNotPlaying = true;
	currentPosition = 0;
	onPositionChanged: (position: number, source: PosChangeSource)=>any;
	NotifyCurrentPosChanged(newPos: number, source: PosChangeSource) {
		this.currentPosition = newPos;
		if (this.onPositionChanged) this.onPositionChanged(this.currentPosition, source);
		if (this.loadedClipInfo && this.loadedClipInfo.endTime && this.currentPosition >= this.loadedClipInfo.endTime) {
			this.OnEndReached();
		}
	}
	positionUpdateTimer = new Timer(100, ()=>{
		if (!this.ready) return;
		if (this.state != YoutubePlayerState.PLAYING) return; // this is needed, since getCurrentTime() doesn't reflect changes from SetPosition calls, while video isn't running
		this.NotifyCurrentPosChanged(this.internalPlayer.getCurrentTime(), "playback");
	});

	loop = false; // must be manually set, after LoadVideo() is called, but before Play() is called (well, if you want it to work reliably)
	OnEndReached() {
		// if null, clip must have ended while we were trying to stop/switch the video; just do nothing
		if (this.loadedClipInfo == null) return;

		if (this.loop) {
			this.SetPosition(this.loadedClipInfo.startTime ?? 0);
			this.Play();
		} else {
			this.PauseOrStop();
		}
	}

	WaitTillState(...waitForStates: YoutubePlayerState[]) {
		return new Promise<void>((resolve, reject)=>{
			this.AddStateListener((state, removeListener)=>{
				if (waitForStates.Contains(state)) {
					resolve();
					removeListener();
				}
			});
		});
	}
	/*WaitTillPlayingThenEnded() {
		//let hasBeenUnstarted = false;
		let hasBeenPlaying = false;
		player.AddStateListener((state, removeListener)=> {
			if (state == YoutubePlayerState.UNSTARTED) {
				//hasBeenUnstarted = true;

				if (hasBeenPlaying) {
					// user must have started another audio file, so consider this audio as having completed
					resolve();
					removeListener();
				}
			} else if (state == YoutubePlayerState.PLAYING) {
				hasBeenPlaying = true;
			} else if (state == YoutubePlayerState.ENDED && hasBeenPlaying) {
				resolve();
				removeListener();
			}
		});
	}*/

	loadedClipInfo: YoutubeClipInfo|null;
	/** Promise is resolved once video has completed loading/buffering. */
	async LoadVideo(info: YoutubeClipInfo, autoplay = false, markOwned = true) {
		this.AssertReady();
		const oldInfo = this.loadedClipInfo;
		this.loadedClipInfo = null;

		if (oldInfo == null || info.videoID != oldInfo.videoID || info.quality != oldInfo.quality) {
			//this.internalPlayer[autoplay ? "loadVideoById" : "cueVideoById"]({
			this.internalPlayer["cueVideoById"]({
				videoId: info.videoID,
				startSeconds: info.startTime || undefined,
				//endSeconds: info.endTime || undefined, // handle end-time ourselves, for consistency (and because built-in end-time doesn't seem reliable)
				suggestedQuality: YoutubeQuality[info.quality || YoutubeQuality.default],
			});
			//await this.WaitTillState(autoplay ? YoutubePlayerState.PLAYING : YoutubePlayerState.CUED);
		} else {
			this.internalPlayer.seekTo(info.startTime, true);
		}
		// to detect video-load completion, call play(), and wait for state to reflect (only way I know atm)
		this.internalPlayer.playVideo();
		await this.WaitTillState(YoutubePlayerState.PLAYING);
		if (!autoplay) {
			this.internalPlayer.pauseVideo();
			await this.WaitTillState(YoutubePlayerState.PAUSED);
		}
		this.loadedClipInfo = info;

		if (markOwned) this.hasOwner = true;
	}
	SetPlaybackRate(speed: number) {
		this.AssertReady();
		this.internalPlayer.setPlaybackRate(speed);
	}
	SetVolume(volume: number) {
		this.AssertReady();
		this.internalPlayer.setVolume(volume * 100);
	}

	/** Before calling, make sure video-load has completed, ie. "await LoadVideo()". (else, this call can fail, and even disrupt video-load's start-time) */
	SetPosition(timeInSec: number) {
		this.AssertReady();
		this.internalPlayer.seekTo(timeInSec, true);
		// we need to just tell it the new time, because the seekTo command does not apply instantly (which is needed for some call-paths, apparently)
		this.NotifyCurrentPosChanged(timeInSec, "setPosition");
	}

	lastPlayTime: number;
	Play() {
		this.AssertReady();
		/*if (this.lastPlayTime != null) {
			this.SetPosition(this.loadedClipInfo.startTime || 0);
		}*/
		this.internalPlayer.playVideo();
		this.lastPlayTime = Date.now();
	}
	Pause() {
		this.AssertReady();
		this.internalPlayer.pauseVideo();
	}
	StopAndClearBuffer() {
		this.AssertReady();
		this.internalPlayer.stopVideo();
		//this.UpdateCurrentPos();
		this.loadedClipInfo = null; // clear loaded-clip-info, since it doesn't reflect the (empty) buffered state anymore
	}

	// todo: fix that this does not reliably persistently-stop the player
	// (I think this is due to pause/stop being called just before it ends, triggering the looping mechanism to start it again)
	PauseOrStop() {
		// if we're within the buffered-youtube-players limit, just pause the player (for faster play again later)
		if (manager.GetYoutubePlayersToKeepBuffered && GetBufferingOrBufferedYoutubePlayers().length <= GetYoutubePlayersToKeepBuffered()) {
			this.Pause();
		}
		// else, stop and clear the buffer (this lets low-memory devices prevent out-of-memory crashes)
		else {
			this.StopAndClearBuffer();
		}
	}
}

/* /** Key: JSON of the clip-info/config object. Value: Array of players for the key. (will be multiple if first was playing while a second play request was made) *#/
export let youtubePlayers = {};
export function GetReadyYoutubePlayerForClipInfo(info: YoutubeClipInfo) {
	let key = ToJSON(info);
	let players = youtubePlayers[key] || [];
	let readyPlayer = players.filter(a=>a.)
} */

function GetYoutubePlayersToKeepBuffered() {
	return manager.GetYoutubePlayersToKeepBuffered ? manager.GetYoutubePlayersToKeepBuffered() : -1;
}

export const youtubePlayers = [] as YoutubePlayer[];
export function GetUnownedYoutubePlayers() { return youtubePlayers.filter(a=>!a.hasOwner); }
export function GetBufferingOrBufferedYoutubePlayers() { return youtubePlayers.filter(a=>[YoutubePlayerState.BUFFERING, YoutubePlayerState.PLAYING, YoutubePlayerState.PAUSED, YoutubePlayerState.ENDED].Contains(a.state)); }
export async function GetUnownedYoutubePlayerReady(preferredClipInfoMatch: YoutubeClipInfo) {
	//let unownedPlayers = youtubePlayers.filter(a=>a.state == YoutubePlayerState.ENDED);
	// order by last-play-time, so that we prefer unowned-players which have not been used recently
	const unownedPlayers_all = GetUnownedYoutubePlayers().OrderBy(a=>a.lastPlayTime);
	const unownedPlayers_matchingClip = unownedPlayers_all.filter(a=>preferredClipInfoMatch && a.loadedClipInfo && a.loadedClipInfo.videoID == preferredClipInfoMatch.videoID && a.loadedClipInfo.quality == preferredClipInfoMatch.quality).OrderBy(a=>a.lastPlayTime);

	// if unowned+matching player, always reuse that as it has no negative side effects
	// else, reuse an unowned+nonmatching player *if* we've reached the buffered-players limit
	// else, create a new one
	const player = unownedPlayers_matchingClip.FirstOrX() || (youtubePlayers.length >= GetYoutubePlayersToKeepBuffered() && unownedPlayers_all.FirstOrX()) || new YoutubePlayer();
	await player.EnsureReady();
	return player;
}