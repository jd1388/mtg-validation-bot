import { ICardData } from "./decklist-service.js";
import { PriceInformation } from "./scryfall.js";

export const getCardPrice = (price: PriceInformation): number => {
    return [
        price.usd,
        price.usd_foil,
        price.usd_etched
    ]
        .map((price) => price ? parseFloat(price) : NaN)
        .reduce((lowestPrice, price) => {
            if (price && isNaN(lowestPrice)) {
                return price;
            } else if (price < lowestPrice) {
                return price;
            }

            return lowestPrice;
        }, NaN);
}

export const isBasicLand = (cardData: ICardData): boolean => cardData.type_line.toLowerCase().includes('basic');
