import { MtgFormat } from "../types/mtg-formats";

export type RuleConfiguration = string | [string, any[]];

export const commander: RuleConfiguration[] = [
    ['format-legal', [MtgFormat.COMMANDER]],
    ['has-legal-commander', [MtgFormat.COMMANDER]],
    ['format-decksize', [MtgFormat.COMMANDER]],
    'singleton',
];
