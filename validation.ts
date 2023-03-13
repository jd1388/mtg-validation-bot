import { CardInformation, PriceInformation, getCardInfo } from "./scryfall";

const delay = (delayLength: number = 1000): Promise<void> => new Promise((resolve) => setTimeout(resolve, delayLength));

interface IDeckListEntry {
    quantity: number;
    name: string;
}

type HydratedDecklistEntry = IDeckListEntry & {
    scryfallData: CardInformation;
};

export const getCardPrice = (price: PriceInformation): number => {
    if (price.usd && price.usd_foil) {
        const normalPrice = parseFloat(price.usd);
        const foilPrice = parseFloat(price.usd_foil);

        return normalPrice < foilPrice ? normalPrice : foilPrice;
    }

    if (price.usd) {
        return parseFloat(price.usd);
    }

    if (price.usd_foil) {
        return parseFloat(price.usd_foil);
    }

    return NaN;
}

interface IDecklistValidationInformation {
    validationErrors: string[];
    decklistData: HydratedDecklistEntry[],
    totalValue: number;
}

export const validateDecklist = async (decklist: string[], commanderPrice: number): Promise<IDecklistValidationInformation> => {
    const validationErrors: string[] = [];
    const parsedDecklist = decklist
        .map((decklistEntry) => decklistEntry.trim())
        .map((decklistEntry) => {
            const quantityNameDividingSpace = decklistEntry.indexOf(' ')
            const quantity = parseFloat(decklistEntry.substring(0, quantityNameDividingSpace));
            const name = decklistEntry.substring(quantityNameDividingSpace).trim();

            if (!quantity || !name) {
                validationErrors.push(`The decklist entry "${decklistEntry}" is in the wrong format. Please resubmit using the format "<quantity> <card name>".`);

                return null;
            }

            return {
                quantity,
                name
            };
        })
        .filter((decklistEntry): decklistEntry is IDeckListEntry => decklistEntry !== null);
    
    const numberOfCardsInDecklist = parsedDecklist.reduce((totalCards, decklistEntry) => decklistEntry.quantity + totalCards, 0);

    if (numberOfCardsInDecklist !== 99) {
        validationErrors.push(`Your decklist contains ${numberOfCardsInDecklist + 1} cards instead of 100. Please modify your decklist to meet this requirement and resubmit.`);
    }

    let totalValue = isNaN(commanderPrice) ? 0 : commanderPrice;
    const decklistData: HydratedDecklistEntry[] = [];

    for (const decklistEntry of parsedDecklist) {
        await delay(50);

        const [entryCardData] = await getCardInfo(decklistEntry.name);

        if (entryCardData === undefined) {
            validationErrors.push(`The card "${decklistEntry.name}" does not exist. Please check your spelling and resubmit.`)
        } else {
            decklistData.push({
                ...decklistEntry,
                scryfallData: entryCardData
            });

            const entryCardPrice = getCardPrice(entryCardData.prices);

            if (isNaN(entryCardPrice)) {
                validationErrors.push(`The card "${decklistEntry.name}" does not have pricing information. Please verify this is the correct card and resubmit.`)
            } else if (!entryCardData.type_line.toLowerCase().includes('basic')){
                totalValue += entryCardPrice;
            }

            if (entryCardData.legalities.commander === 'banned') {
                validationErrors.push(`The card "${decklistEntry.name}" is a banned card. Please replace this card and resubmit.`)
            }
        }
    }

    if (totalValue > 25) {
        validationErrors.push(`The total deck value is **$${totalValue.toFixed(2)}**, exceeding the **$25.00** budget. Please modify your deck to have a value below the budget and resubmit.`)
    }

    return {
        validationErrors,
        decklistData,
        totalValue
    };
};
