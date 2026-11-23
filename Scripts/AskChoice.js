// Minimal synchronous-friendly prompt helper: prints the question to stderr (so it stays visible when stdout is captured),
// reads one line from stdin, and prints the answer to stdout in a machine-readable form.
// Called by Scripts/DockerContextForK8sContext.js through spawnSync, which is what makes the question synchronous for the caller.
const readline = require("readline");

const question = process.argv[2] ?? "Continue?";
const rl = readline.createInterface({input: process.stdin, output: process.stderr, terminal: process.stderr.isTTY === true});

const WriteAndExit = (answerMarker, exitCode)=>{
	try { rl.close(); } catch {}
	process.stdout.write(`${answerMarker}\n`, ()=>process.exit(exitCode));
	// fallback in case the write callback never runs (eg. stdout already gone)
	setTimeout(()=>process.exit(exitCode), 250).unref();
};
// Ctrl+C must cancel the whole run; exit with the conventional SIGINT code so the caller can tell it apart from an empty answer
const Cancel = ()=>WriteAndExit("ANSWER_CANCELLED:1", 130);
rl.on("SIGINT", Cancel);
process.on("SIGINT", Cancel);

let answered = false;
rl.question(question + " ", answer=>{
	answered = true;
	WriteAndExit(`ANSWER:${answer}`, 0);
});
rl.on("close", ()=>{
	// stdin went away without an answer (eg. the console interrupted the prompt, or input was redirected); the caller treats this as a cancellation
	if (!answered) WriteAndExit("ANSWER_EOF:1", 0);
});
