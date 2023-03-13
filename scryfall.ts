import querystring from 'node:querystring';

interface IScryfallCardInformation {
    object: 'card';
    id: string;
    name: string;
    legalities: {
        commander: 'legal' | 'not_legal' | 'banned'
    }
    prices: {
        usd: string | null;
        usd_foil: string | null;
    }
    type_line: string;
}

export type PriceInformation = {
    usd: string;
    usd_foil: null;
} | {
    usd: null;
    usd_foil: string;
} | {
    usd: string;
    usd_foil: string;
};

export type CardInformation = IScryfallCardInformation & {
    prices: PriceInformation
}

interface IScryfallCardResponse {
    object: 'list';
    total_cards: number;
    has_more: boolean;
    data: IScryfallCardInformation[];
}

const scryfallBaseUrl = 'https://api.scryfall.com';

export const getCardInfo = async (cardName: string): Promise<CardInformation[]> => {
    const queryParams = querystring.stringify({
        q: `!"${cardName.toLowerCase()}"`,
        order: 'usd',
        dir: 'asc'
    });
    const url = `${scryfallBaseUrl}/cards/search?${queryParams}`;

    const response = await fetch(url);
    
    if (!response.ok) {
        const parsedError = await response.text();
        console.log('card not found', cardName);

        console.log('TODO: HANDLE FOR WHEN A CARD IS NOT FOUND', parsedError);

        return [];
    }

    const parsedResponse = await response.json() as IScryfallCardResponse;

    const cards = parsedResponse.data.filter((cardData) => cardData.prices.usd !== null || cardData.prices.usd_foil !== null) as CardInformation[];

    return cards;
};
