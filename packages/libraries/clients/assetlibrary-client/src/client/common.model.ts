export type StringToArrayMap = { [key: string] : string[]};

export type DirectionStringToArrayMap = {
	in?: StringToArrayMap,
	out?: StringToArrayMap
};

export interface RequestHeaders {
	[key:string] : string;
}
