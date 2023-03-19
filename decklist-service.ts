import { IScryfallCardInformation, getCardInfo } from "./scryfall.js";
import { delay } from "./utilities.js";

interface ICardEntry {
    quantity: number;
    name: string;
}

interface IDecklistEntryData {
    commander: string;
    decklist: ICardEntry[];
}

export interface ICardData extends IScryfallCardInformation {
    quantity: number;
}

export interface IDecklistData {
    commander: ICardData | null;
    decklist: ICardData[];
}

export const parseDecklistInput = (rawDecklistInput: string): [ICardEntry[], string[]] => {
    const validationErrors: string[] = [];
    const decklistRecord = rawDecklistInput
        .split('\n')
        .map((decklistEntry) => decklistEntry.trim())
        .filter((decklistEntry) => decklistEntry.length)
        .reduce((decklist, decklistEntry) => {
            const quantityNameDividingSpace = decklistEntry.indexOf(' ')
            const quantity = parseFloat(decklistEntry.substring(0, quantityNameDividingSpace));
            const name = decklistEntry.substring(quantityNameDividingSpace).trim();

            if (!quantity || !name) {
                validationErrors.push(`The decklist entry "${decklistEntry}" is in the wrong format. Please resubmit using the format "<quantity> <card name>".`);

                return decklist;
            }

            const existingEntry = decklist[name] | 0;

            return {
                ...decklist,
                [name]: existingEntry + quantity
            }
        }, {} as Record<string, number>);

    const parsedDecklist = Object.entries(decklistRecord)
        .map(([name, quantity]) => ({
            name,
            quantity
        }));

    return [parsedDecklist, validationErrors];
};

export const getDecklistInformation = async (decklistEntryData: IDecklistEntryData): Promise<[IDecklistData, string[]]> => {
    const validationErrors: string[] = [];
    const [commanderCardInfo] = await getCardInfo(decklistEntryData.commander);

    if (!commanderCardInfo) {
        validationErrors.push(`The commander "${decklistEntryData.commander}" does not exist. Please check your spelling and resubmit.`)
    }

    const decklistCardInfo = await Promise.all(decklistEntryData.decklist
        .map(async (decklistEntry) => {
            await delay(50);

            const [entryCardData] = await getCardInfo(decklistEntry.name);

            if (!entryCardData) {
                validationErrors.push(`The card "${decklistEntry.name}" does not exist. Please check your spelling and resubmit.`);

                return null;
            }

            return {
                ...entryCardData,
                quantity: decklistEntry.quantity
            } as ICardData;
        })
    );
    const filteredDecklistCardInfo = decklistCardInfo.filter((cardData): cardData is ICardData => cardData !== null);
    
    const decklistData = {
        commander: commanderCardInfo ? {
            ...commanderCardInfo,
            quantity: 1
        } : null,
        decklist: filteredDecklistCardInfo
    };

    return [decklistData, validationErrors];
};
