import querystring from 'node:querystring';

import { MtgFormat } from './types/mtg-formats.js';
import { MtgLegality } from './types/mtg-legalities.js';
import { MtgManaColor } from './types/mtg-mana-colors.js';

export interface IScryfallCardInformation {
    object: 'card';
    id: string;
    name: string;
    legalities: Record<MtgFormat, MtgLegality>
    prices: PriceInformation
    type_line: string;
    scryfall_uri: string;
    color_identity: MtgManaColor[];
}

export type PriceInformation = {
    usd: string | null;
    usd_foil: string | null;
    usd_etched: string | null;
};

interface IScryfallCardResponse {
    object: 'list';
    total_cards: number;
    has_more: boolean;
    data: IScryfallCardInformation[];
}

const scryfallBaseUrl = 'https://api.scryfall.com';

export const getCardInfo = async (cardName: string): Promise<IScryfallCardInformation[]> => {
    const queryParams = querystring.stringify({
        q: `!"${cardName.toLowerCase()}"`,
        order: 'usd',
        dir: 'asc'
    });
    const url = `${scryfallBaseUrl}/cards/search?${queryParams}`;

    if (cardName.includes('Chishiro')) {
        console.log('query params', queryParams);
    }

    const response = await fetch(url);
    
    if (!response.ok) {
        const parsedError = await response.text();
        console.log('card not found', cardName);

        console.log('TODO: HANDLE FOR WHEN A CARD IS NOT FOUND', parsedError);

        return [];
    }

    const parsedResponse = await response.json() as IScryfallCardResponse;

    if (cardName.includes('Chishiro')) {
        console.log('response', parsedResponse);
        console.log('prices', parsedResponse.data[0].prices);
    }

    const cards = parsedResponse.data.filter((cardData) => cardData.prices.usd !== null || cardData.prices.usd_foil !== null || cardData.prices.usd_etched !== null);

    return cards;
};
