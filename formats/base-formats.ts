import { MtgFormat } from "../types/mtg-formats.js";

export type RuleConfiguration = string | [string, any[]];

export const commander: RuleConfiguration[] = [
    ['format-legal', [MtgFormat.COMMANDER]],
    ['has-legal-commander', [MtgFormat.COMMANDER]],
    ['decksize', [100]],
    'singleton',
    'color-identity'
];
