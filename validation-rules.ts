import { IDecklistData } from "./decklist-service.js";
import { MtgFormat } from "./types/mtg-formats.js";
import { MtgLegality } from "./types/mtg-legalities.js";
import { getCardPrice } from "./card-data-utilities.js";

export const isFormatLegal = (format: MtgFormat) => (decklistData: IDecklistData): string[] => {
    const validationErrors: string[] = [];

    if (decklistData.commander && decklistData.commander.legalities[format] !== MtgLegality.LEGAL) {
        validationErrors.push(`Your commander "${decklistData.commander.name}" is not legal in this format. Please select a different commander and resubmit.`)
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

            return cardPrice;
        })
        .filter((cardPrice) => !isNaN(cardPrice))
        .reduce((totalCost, cardPrice) => totalCost + cardPrice, 0);

    if (decklistData.commander) {
        const commanderPrice = getCardPrice(decklistData.commander.prices);

        if (isNaN(commanderPrice)) {
            validationErrors.push(`Your commander "${decklistData.commander.name}" does not have pricing information. Please verify this is the correct card and resubmit.`);
        }

        const totalDeckCost = decklistTotalCost + commanderPrice;

        if (totalDeckCost > budget) {
            validationErrors.push(`The total deck value is **$${totalDeckCost.toFixed(2)}**, exceeding the **$${budget}** budget. Please modify your deck to have a value below the budget and resubmit.`)
        }
    } else if (decklistTotalCost > budget) {
        validationErrors.push(`The total deck value is **$${decklistTotalCost.toFixed(2)}**, exceeding the **$${budget}** budget. Please modify your deck to have a value below the budget and resubmit.`)
    }

    return validationErrors;
};

export const isCommanderValid = (format: MtgFormat) => (decklistData: IDecklistData): string[] => {
    if (format === MtgFormat.COMMANDER) {
        if (decklistData.commander !== null && (!decklistData.commander.type_line.toLowerCase().includes('legendary') || !decklistData.commander.type_line.toLowerCase().includes('creature'))) {
            return [`Your commander "${decklistData.commander.name}" is not a valid commander because it is not a legendary creature. Please select a different card as your commander and resubmit.`]
        }
    }

    return [];
};

export const isCommanderBudgetExceeded = (budget: number) => (decklistData: IDecklistData): string[] => {
    if (decklistData.commander) {
        const commanderPrice = getCardPrice(decklistData.commander.prices);

        if (!isNaN(commanderPrice) && commanderPrice > budget) {
            return [`Your commander "${decklistData.commander.name}" has a value of **$${commanderPrice.toFixed(2)}**, exceeding the budget of **$${budget}**. Please select a different commander and resubmit.`]
        }
    }

    return [];
};

export const isDeckSizeMatchingFormat = (format: MtgFormat) => (decklistData: IDecklistData): string[] => {
    const decklistSize = decklistData.decklist
        .map((cardData) => cardData.quantity)
        .reduce((totalCards, cardQuantity) => totalCards + cardQuantity, 0)
    
    if (format === MtgFormat.COMMANDER) {
        const COMMANDER_DECKSIZE = 100;

        if (decklistData.commander) {
            if (decklistSize + 1 !== COMMANDER_DECKSIZE) {
                return [`Your decklist contains ${decklistSize + 1} cards instead of 100. Please modify your decklist to meet this requirement and resubmit.`]
            }
        }
    }

    return [];
};

export const isDecklistSingleton = (decklistData: IDecklistData): string[] => {
    const nonSingletonCards = decklistData.decklist.filter((cardData) => cardData.quantity > 1 && !cardData.type_line.toLowerCase().includes('basic'));

    return nonSingletonCards.map((cardData) => `You have ${cardData.quantity} copies of "${cardData.name}" when only one is allowed. Please modify your decklist to only contain 1 copy of this card and resubmit.`);
};

export const isInCommanderColorIdentity = (decklistData: IDecklistData): string[] => {
    if (!decklistData.commander) {
        return [];
    }

    return decklistData.decklist
        .filter((cardData) => {
            const cardColors = cardData.color_identity;
            const cardColorsOutsideCommanderColorIdentity = cardColors.filter((color) => !decklistData.commander?.color_identity.includes(color));

            return cardColorsOutsideCommanderColorIdentity.length > 0;
        })
        .map((cardData) => `The card "${cardData.name}" does not match your commander's color identity. Please remove this card and resubmit.`);
};
