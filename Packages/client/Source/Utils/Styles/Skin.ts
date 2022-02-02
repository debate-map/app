export abstract class Skin {
	abstract HeaderFont(): string;
	abstract MainFont(): string;
	abstract TextColor(): string;

	// possible style overrides
	FreeformStyleSection = ()=>"";
	ButtonStyleOverrides = ()=>"";
}