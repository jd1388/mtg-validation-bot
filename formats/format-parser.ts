import { IDecklistData } from "../decklist-service.js";
import { isCommanderBudgetExceeded, isCommanderValid, isDecklistAtRequiredSize, isDecklistSingleton, isFormatLegal, isInCommanderColorIdentity, isTotalBudgetExceeded } from "../validation-rules.js";
import { RuleConfiguration } from "./base-formats.js";
import { IFormatConfiguration } from "./custom-formats.js";

type RuleFunction = (decklistData: IDecklistData) => string[];

interface IFormat {
    name: string;
    displayName: string;
    rules: RuleFunction[]
}

const mergeBaseAndOverrideRules = (overrideRules: RuleConfiguration[], baseRules?: RuleConfiguration[]): RuleConfiguration[] => {
    if (!baseRules) {
        return overrideRules;
    }

    const rulesMap: Record<string, any> = {};

    [...baseRules, ...overrideRules].forEach((rule) => {
        if (typeof rule === 'string') {
            rulesMap[rule] = null;
        } else {
            const [ruleName, ruleOptions] = rule;

            rulesMap[ruleName] = ruleOptions;
        }
    });

    const combinedRules: RuleConfiguration[] = Object.entries(rulesMap).map(([ruleName, ruleOptions]) => {
        if (ruleOptions === null) {
            return ruleName
        }

        return [ruleName, ruleOptions];
    });

    return combinedRules;
};

export const parseFormatConfiguration = (formatConfiguration: IFormatConfiguration): IFormat => {
    const rulesMap: Record<string, any> = {
        'format-legal': isFormatLegal,
        'has-legal-commander': isCommanderValid,
        'decksize': isDecklistAtRequiredSize,
        'singleton': isDecklistSingleton,
        'budget': isTotalBudgetExceeded,
        'commander-budget': isCommanderBudgetExceeded,
        'color-identity': isInCommanderColorIdentity
    };

    const configurationRules = mergeBaseAndOverrideRules(formatConfiguration.rules, formatConfiguration.base);
    const rules = configurationRules.map((ruleConfiguration) => {
        if (typeof ruleConfiguration === 'string') {
            if (!rulesMap[ruleConfiguration]) {
                console.log(`WARNING: the rule "${ruleConfiguration}" does not exist and has been skipped`);

                return () => [];
            }

            return rulesMap[ruleConfiguration] as RuleFunction;
        }

        const [ruleName, ruleOptions] = ruleConfiguration;

        if (!rulesMap[ruleName]) {
            console.log(`WARNING: the rule "${ruleConfiguration}" does not exist and has been skipped`);

            return () => [];
        }

        return rulesMap[ruleName](...ruleOptions) as RuleFunction;
    });

    return {
        name: formatConfiguration.name,
        displayName: formatConfiguration.displayName,
        rules
    };
};
