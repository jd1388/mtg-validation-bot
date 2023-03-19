import { IDecklistData } from "../decklist-service.js";
import { isCommanderBudgetExceeded, isCommanderValid, isDeckSizeMatchingFormat, isDecklistSingleton, isFormatLegal, isInCommanderColorIdentity, isTotalBudgetExceeded } from "../validation-rules";
import { IFormatConfiguration } from "./custom-formats.js";

type RuleFunction = (decklistData: IDecklistData) => string[];

interface IFormat {
    name: string;
    displayName: string;
    rules: RuleFunction[]
}

export const parseFormatConfiguration = (formatConfiguration: IFormatConfiguration): IFormat => {
    const rulesMap: Record<string, any> = {
        'format-legal': isFormatLegal,
        'has-legal-commander': isCommanderValid,
        'format-decksize': isDeckSizeMatchingFormat,
        'singleton': isDecklistSingleton,
        'budget': isTotalBudgetExceeded,
        'commander-budget': isCommanderBudgetExceeded,
        'color-identity': isInCommanderColorIdentity
    };

    const rules = [...(formatConfiguration.base || []), ...formatConfiguration.rules].map((ruleConfiguration) => {
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
