import { getCardPrice } from "./card-data-utilities.js";
import { ICardData } from "./decklist-service.js";

export const createReportLine = (cardData: ICardData): string => {
    const rowCells = [
        cardData.quantity,
        `"${cardData.name}"`,
        `$${getCardPrice(cardData.prices).toFixed(2)}`,
        cardData.scryfall_uri
    ];

    return rowCells.join(',');
};

interface ICreateMultipartFormDataEntryParameters {
    name: string;
    contentType: string;
    extraOptions?: Record<string, string>;
    content: string;
}

export const createMultipartFormDataEntry = ({
    name,
    contentType,
    extraOptions,
    content
}: ICreateMultipartFormDataEntryParameters): string => {
    const baseContentDisposition = `Content-Disposition: form-data; name="${name}"`;
    const extraContentDispositionOptions = extraOptions ? Object.entries(extraOptions).map(([key, value]) => `${key}="${value}"`).join('; ') : null;
    const contentDispositionLine = extraContentDispositionOptions ? [baseContentDisposition, extraContentDispositionOptions].join('; ') : baseContentDisposition;
    const contentTypeLine = `Content-Type: ${contentType}`;

    return `${contentDispositionLine}\n${contentTypeLine}\n\n${content}`;
};

export const stringToBlob = (stringToConvert: string, type: string): Blob => new Blob([stringToConvert], {
    type
});
