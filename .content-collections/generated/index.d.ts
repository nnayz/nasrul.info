import configuration from "../../metadata.ts";
import { GetTypeByName } from "@content-collections/core";

export type Writing = GetTypeByName<typeof configuration, "Writing">;
export declare const allWritings: Array<Writing>;

export type Highlight = GetTypeByName<typeof configuration, "Highlight">;
export declare const allHighlights: Array<Highlight>;

export {};
