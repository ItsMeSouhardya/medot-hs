import prompts from "./interaction-prompts.json";
export const interactionPrompts = prompts;
export type InteractionPrompt = keyof typeof prompts.en;
