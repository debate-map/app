// Shared utility functions for database backup scripts

const child_process = require("child_process");

/**
 * Returns a filesystem-safe string representation of the current time.
 * Example: "2021-12-10-09-18-52"
 */
const CurrentTime_SafeStr = ()=>new Date().toLocaleString("sv").replace(/[ :]/g, "-");

/**
 * Waits for the user to press any key before exiting the process.
 * Useful for keeping the terminal window open when run from task scheduler or other automated contexts.
 * @param {number} code - The exit code to use when exiting the process (simple version: 0 for success, 1 for error).
 */
function WaitForEnterKeyThenExit(code) {
	console.log("Press any key to exit...");
	process.stdin.setRawMode(true);
	process.stdin.resume();
	process.stdin.on("data", ()=>process.exit(code));
}

/**
 * Opens the file explorer (cross-platform) at the specified folder path.
 * @param {string} folderPathAbsolute - The absolute path to the folder to open
 */
function OpenFolderInExplorer(folderPathAbsolute) {
	if (process.platform === "win32") {
		child_process.exec(`start "" "${folderPathAbsolute}"`);
	} else if (process.platform === "darwin") {
		child_process.exec(`open "${folderPathAbsolute}"`);
	} else { // linux and other platforms
		child_process.exec(`xdg-open "${folderPathAbsolute}"`);
	}
}

module.exports = {
	CurrentTime_SafeStr,
	WaitForEnterKeyThenExit,
	OpenFolderInExplorer,
};