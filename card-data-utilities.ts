import { ICardData } from "./decklist-service.js";
import { PriceInformation } from "./scryfall.js";

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

export const isBasicLand = (cardData: ICardData): boolean => cardData.type_line.toLowerCase().includes('basic');
