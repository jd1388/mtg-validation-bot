import { IScryfallCardInformation, getCardInfo } from "./scryfall.js";

interface ICardEntry {
    quantity: number;
    name: string;
}

interface IDecklistEntryData {
    commander: ICardEntry[];
    decklist: ICardEntry[];
}

export interface ICardData extends IScryfallCardInformation {
    quantity: number;
}

export interface IDecklistData {
    commander: ICardData[];
    decklist: ICardData[];
}

export const parseCommanderInput = (rawCommanderInput: string): ICardEntry[] => rawCommanderInput
    .split('\n')
    .map((commanderEntry) => commanderEntry.trim())
    .filter((commanderEntry) => commanderEntry.length)
    .map((commanderEntry) => ({
        quantity: 1,
        name: commanderEntry
    }));

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

    const commanderCardInfo = await Promise.all(decklistEntryData.commander
        .map(async (commanderEntry) => {
            const [entryCardData] = await getCardInfo(commanderEntry.name);

            if (!entryCardData) {
                validationErrors.push(`The commander "${commanderEntry.name}" does not exist. Please check your spelling and resubmit.`);

                return null;
            }

            return {
                ...entryCardData,
                quantity: commanderEntry.quantity
            } as ICardData;
        })
    );

    const filteredCommanderCardInfo = commanderCardInfo.filter((cardData): cardData is ICardData => cardData !== null);

    const decklistCardInfo = await Promise.all(decklistEntryData.decklist
        .map(async (decklistEntry) => {
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
        commander: filteredCommanderCardInfo,
        decklist: filteredDecklistCardInfo
    };

    return [decklistData, validationErrors];
};
