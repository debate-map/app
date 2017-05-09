G({NextWasted}); declare global { function NextWasted(); }

//React.addons.Perf.start();
export function NextWasted() {
	React.addons.Perf.stop();
	React.addons.Perf.printWasted();
	React.addons.Perf.start();
}