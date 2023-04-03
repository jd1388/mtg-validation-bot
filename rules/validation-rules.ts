import { IDecklistData } from "../services/decklist-service.js";
import { MtgFormat } from "../types/mtg-formats.js";
import { MtgLegality } from "../types/mtg-legalities.js";
import { MtgManaColor } from "../types/mtg-mana-colors.js";
import { getCardPrice } from "../utils/card-data-utilities.js";

export const isFormatLegal = (format: MtgFormat) => (decklistData: IDecklistData): string[] => {
    const validationErrors: string[] = [];

    if (decklistData.commander.length) {
        decklistData.commander.forEach((commanderEntry) => {
            if (commanderEntry.legalities[format] !== MtgLegality.LEGAL) {
                validationErrors.push(`Your commander "${commanderEntry.name}" is not legal in this format. Please select a different commander and resubmit.`)
            }
        });
    }

    decklistData.decklist.forEach((decklistEntry) => {
        if (decklistEntry.legalities[format] !== MtgLegality.LEGAL) {
            validationErrors.push(`The card "${decklistEntry.name}" is a banned card. Please replace this card and resubmit.`)
        }
    });

    return validationErrors;
};

export const isTotalBudgetExceeded = (budget: number) => (decklistData: IDecklistData): string[] => {
    const validationErrors: string[] = [];

    const decklistTotalCost = decklistData.decklist
        .map((decklistEntry) => {
            const cardPrice = getCardPrice(decklistEntry.prices);

            if (isNaN(cardPrice)) {
                validationErrors.push(`The card "${decklistEntry.name}" does not have pricing information. Please verify this is the correct card and resubmit.`);
            }

            if (decklistEntry.type_line.toLowerCase().includes('basic')) {
                return 0;
            }

            return cardPrice * decklistEntry.quantity;
        })
        .filter((cardPrice) => !isNaN(cardPrice))
        .reduce((totalCost, cardPrice) => totalCost + cardPrice, 0);

    const commanderTotalCost = decklistData.commander
        .map((commanderEntry) => {
            const cardPrice = getCardPrice(commanderEntry.prices);

            if (isNaN(cardPrice)) {
                validationErrors.push(`The commander "${commanderEntry.name}" does not have pricing information. Please verify this is the correct card and resubmit.`);
            }

            if (commanderEntry.type_line.toLowerCase().includes('basic')) {
                return 0;
            }

            return cardPrice * commanderEntry.quantity;
        })
        .filter((cardPrice) => !isNaN(cardPrice))
        .reduce((totalCost, cardPrice) => totalCost + cardPrice, 0);

    const totalDeckCost = decklistTotalCost + commanderTotalCost;

    if (totalDeckCost > budget) {
        validationErrors.push(`The total deck value is **$${totalDeckCost.toFixed(2)}**, exceeding the **$${budget}** budget. Please modify your deck to have a value below the budget and resubmit.`)
    }

    return validationErrors;
};

export const isCommanderValid = (format: MtgFormat) => (decklistData: IDecklistData): string[] => {
    if (format === MtgFormat.COMMANDER) {
        if (decklistData.commander.length) {
            if (decklistData.commander.length === 1) {
                decklistData.commander.forEach((commanderEntry) => {
                    if ((!commanderEntry.type_line.toLowerCase().includes('legendary') || !commanderEntry.type_line.toLowerCase().includes('creature'))) {
                        return [`Your commander "${commanderEntry.name}" is not a valid commander because it is not a legendary creature. Please select a different card as your commander and resubmit.`];
                    }
                });
            } else if (decklistData.commander.length > 2) {
                return [`Your deck contains ${decklistData.commander.length} commanders. Please resubmit with one or two if an effect allows for it.`];
            } else if (decklistData.commander.length === 2) {
                const commanderWithBackground = decklistData.commander.find((cardEntry) => cardEntry.oracle_text.toLowerCase().includes('choose a background'));
                const backgroundCard = decklistData.commander.find((cardEntry) => cardEntry.type_line.toLowerCase().includes('background'));
                const areCommandersPartners = decklistData.commander.reduce((arePartners, commanderEntry) => arePartners && commanderEntry.keywords.includes('Partner') && !commanderEntry.keywords.includes('Partner with'), true);
                const areCommandersFriendsForever = decklistData.commander.reduce((arePartners, commanderEntry) => arePartners && commanderEntry.keywords.includes('Friends forever'), true);
                const isCommanderWithBackground = commanderWithBackground && backgroundCard;
                const areCommandersExplicitPartners = decklistData.commander[0].oracle_text.includes(decklistData.commander[1].name);

                if (areCommandersFriendsForever || areCommandersPartners || isCommanderWithBackground || areCommandersExplicitPartners) {
                    return [];
                }

                return ['The commanders you have selected do not allow for multiple commanders. Please modify your commander selection and resubmit.'];
            }
        } else {
            return ['Your deck does not have a commander. Please update your decklist and resubmit.'];
        }
    }

    return [];
};

export const isCommanderBudgetExceeded = (budget: number) => (decklistData: IDecklistData): string[] => {
    if (decklistData.commander.length) {
        const commanderPrice = decklistData.commander.reduce((totalPrice, commanderEntry) => totalPrice + getCardPrice(commanderEntry.prices), 0);

        if (!isNaN(commanderPrice) && commanderPrice > budget) {
            if (decklistData.commander.length === 1) {
                return [`Your commander "${decklistData.commander[0].name}" has a value of **$${commanderPrice.toFixed(2)}**, exceeding the budget of **$${budget}**. Please select a different commander and resubmit.`];
            }

            return [`Your commanders have a total value of **$${commanderPrice.toFixed(2)}**, exceeding the budget of **$${budget}**. Please modify your commander selection and resubmit.`];
        }
    }

    return [];
};

export const isDecklistAtRequiredSize = (requiredSize: number) => (decklistData: IDecklistData): string[] => {
    const decklistSize = decklistData.decklist
        .map((cardData) => cardData.quantity)
        .reduce((totalCards, cardQuantity) => totalCards + cardQuantity, 0)
    
    if (decklistData.commander) {
        if (decklistSize + decklistData.commander.length !== requiredSize) {
            return [`Your decklist contains ${decklistSize + decklistData.commander.length} cards instead of ${requiredSize}. Please modify your decklist to meet this requirement and resubmit.`]
        }
    } else if (decklistSize !== requiredSize) {
        return [`Your decklist contains ${decklistSize} cards instead of ${requiredSize}. Please modify your decklist to meet this requirement and resubmit.`]
    }

    return [];
};

export const isDecklistSingleton = (decklistData: IDecklistData): string[] => {
    const nonSingletonCards = decklistData.decklist.filter((cardData) => cardData.quantity > 1 && !cardData.type_line.toLowerCase().includes('basic'));

    return nonSingletonCards.map((cardData) => `You have ${cardData.quantity} copies of "${cardData.name}" when only one is allowed. Please modify your decklist to only contain 1 copy of this card and resubmit.`);
};

export const isInCommanderColorIdentity = (decklistData: IDecklistData): string[] => {
    if (!decklistData.commander.length) {
        return [];
    }

    const commanderColorIdentity = Array.from(
        new Set(
            decklistData.commander.reduce((currentColorIdentity, commanderEntry) => [...currentColorIdentity, ...commanderEntry.color_identity], [] as MtgManaColor[])
        )
    );

    return decklistData.decklist
        .filter((cardData) => {
            const cardColors = cardData.color_identity;
            const cardColorsOutsideCommanderColorIdentity = cardColors.filter((color) => !commanderColorIdentity.includes(color));

            return cardColorsOutsideCommanderColorIdentity.length > 0;
        })
        .map((cardData) => `The card "${cardData.name}" does not match your commander's color identity. Please remove this card and resubmit.`);
};
