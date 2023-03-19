import { getCardPrice, isBasicLand } from "./card-data-utilities.js";
import { ICardData } from "./decklist-service.js";

export const createReportLine = (cardData: ICardData): string => {
    const rowCells = [
        cardData.quantity,
        `"${cardData.name}"`,
        `${isBasicLand(cardData) ? '' : `$${getCardPrice(cardData.prices).toFixed(2)}`}`,
        cardData.scryfall_uri
    ];

    return rowCells.join(',');
};

export const stringToBlob = (stringToConvert: string, type: string): Blob => new Blob([stringToConvert], {
    type
});
