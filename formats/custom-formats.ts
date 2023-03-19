import { RuleConfiguration, commander } from "./base-formats.js"

export interface IFormatConfiguration {
    base?: RuleConfiguration[];
    rules: RuleConfiguration[];
    name: string;
    displayName: string;
}

export const budgetCommander: IFormatConfiguration = {
    name: 'budget-commander',
    displayName: '$25 Budget Commander',
    base: commander,
    rules: [
        ['budget', [25]],
        ['commander-budget', [5]]
    ]
};
