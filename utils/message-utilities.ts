import { getCardPrice, isBasicLand } from "./card-data-utilities.js";
import { ICardData } from "../services/decklist-service.js";

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

export const createErrorMessages = (validationErrors: string[]): string[] => {
    const DISCORD_MESSAGE_CHARACTER_LIMIT = 1900;
    const errorMessages = validationErrors.reduce((composedErrorMessages, validationError) => {
        const formattedValidationError = `- ${validationError}`;

        if (!composedErrorMessages.length) {
            return [formattedValidationError];
        }

        const currentErrorMessage = composedErrorMessages[composedErrorMessages.length - 1];
        const currentErrorMessageWithNewValidationError = [currentErrorMessage, formattedValidationError].join('\n');

        if (currentErrorMessageWithNewValidationError.length < DISCORD_MESSAGE_CHARACTER_LIMIT) {
            return [...composedErrorMessages.slice(0, composedErrorMessages.length - 1), currentErrorMessageWithNewValidationError]
        }

        return [...composedErrorMessages, formattedValidationError];
    }, [] as string[])

    return errorMessages;
}
