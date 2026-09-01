import React, {useEffect} from "react";
import {store} from "Store";
import {graph} from "Utils/LibIntegrations/MobXGraphlink";

const POLL_INTERVAL_MS = 200;
const QUIET_WINDOW_MS = 1000;
const SOCKET_DOWN_ERROR_AFTER_MS = 10_000;

declare global {
	interface Window {
		internalCrawler?: {
			path: string;
			status: "loading" | "ready" | "error";
			reason?: string;
		};
	}
}

// tells the baker (baker/src/page.rs) when the page is actually done loading
export function InternalCrawlerReadinessMonitor() {
	useEffect(()=>{
		let path = window.location.pathname;
		let quietSince: number|null = null;
		let lastFingerprint: string|null = null;
		let socketDownSince: number|null = null;

		const check = (): {reason: string|null, fingerprint: string}=>{
			if (!graph.initialized) return {reason: "graphlink initializing", fingerprint: "uninitialized"};
			const stats = graph.GetStats();
			const pending = stats.nodesWithRequestedSubscriptions - stats.nodesWithFulfilledSubscriptions;
			const commitStatus = graph.commitScheduler.scheduledCommit_status;
			const pendingImages = Array.from(document.images).filter(img=>img.loading != "lazy" && !img.complete).length; // skip lazy imgs, they may never load in a hidden tab (failed loads still count as complete so no deadlock)
			const fontStatus = document.fonts.status;

			const fingerprint = [stats.attachedTreeNodes, stats.nodesWithRequestedSubscriptions, stats.nodesWithFulfilledSubscriptions, pendingImages, fontStatus].join(":");
			const reason =
				pending > 0 ? `${pending} subscription(s) pending`
				: commitStatus != "inactive" ? `data-commit ${commitStatus}`
				: pendingImages > 0 ? `${pendingImages} image(s) loading` // graphlink doesn't know about image fetches
				: fontStatus != "loaded" ? "fonts loading"
				: null;
			return {reason, fingerprint};
		};
		const poll = ()=>{
			const nextPath = window.location.pathname;
			if (nextPath != path) {
				path = nextPath;
				quietSince = null; // route changed, start the wait over
			}

			if (store.wvc.webSocketConnected) {
				socketDownSince = null;
			} else {
				socketDownSince ??= performance.now();
				const downForMS = performance.now() - socketDownSince;
				if (downForMS >= SOCKET_DOWN_ERROR_AFTER_MS) {
					window.internalCrawler = {path, status: "error", reason: `websocket disconnected for ${Math.round(downForMS / 1000)}s`}; // so the baker gives up on this page fast instead of waiting the full 50s
					return;
				}
			}

			const {reason, fingerprint} = check();
			if (fingerprint != lastFingerprint) {
				lastFingerprint = fingerprint;
				quietSince = null; // numbers changed since last poll, so stuff is still happening
			}
			if (reason != null) {
				quietSince = null;
				window.internalCrawler = {path, status: "loading", reason};
				return;
			}
			quietSince ??= performance.now();
			if (performance.now() - quietSince < QUIET_WINDOW_MS) {
				window.internalCrawler = {path, status: "loading", reason: "waiting for quiet window"};
				return;
			}
			window.internalCrawler = {path, status: "ready"};
		};

		window.internalCrawler = {path, status: "loading", reason: "readiness monitor starting"};
		const interval = window.setInterval(poll, POLL_INTERVAL_MS); // plain interval since chrome pauses rAF in hidden tabs
		poll();
		return ()=>{
			window.clearInterval(interval);
			delete window.internalCrawler;
		};
	}, []);

	// baked pages have no js, so the synthetic scrollbars would just be frozen props there, swap them for native ones while crawling
	return (
		<style>{`
			.scrollTrack { display: none; }
			.hideScrollbar { scrollbar-width: thin; scrollbar-color: rgba(128,128,128,.75) transparent; } /* setting scrollbar-width makes chrome ignore the ::-webkit-scrollbar width:0 rule, so the native bar comes back */
		`}</style>
	);
}
