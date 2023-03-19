import 'dotenv/config';
import fastify from 'fastify';
import {
    InteractionType,
    InteractionResponseType,
    verifyKey
} from 'discord-interactions';
import rawBody from 'fastify-raw-body';

import * as commands from './commands.js';
import { getCardPrice } from './card-data-utilities.js';
import { ICardData, getDecklistInformation, parseDecklistInput } from './decklist-service.js';
import { MtgFormat } from './types/mtg-formats.js';
import { isCommanderBudgetExceeded, isCommanderValid, isDeckSizeMatchingFormat, isDecklistSingleton, isFormatLegal, isTotalBudgetExceeded } from './validation-rules.js';
import { createMultipartFormDataEntry, createReportLine, stringToBlob } from './message-utilities.js';

const checkEnvironmentVariableIsSet = (environmentVariableName: string) => {
    if (!process.env[environmentVariableName]) {
        console.error(`${environmentVariableName} has not been set in configuration`);
        process.exit(1);
    }
};

[
    'APP_ID',
    'DISCORD_BOT_TOKEN',
    'APP_PUBLIC_KEY'
].forEach(checkEnvironmentVariableIsSet);

const APP_ID = process.env.APP_ID as string;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN as string;
const APP_PUBLIC_KEY = process.env.APP_PUBLIC_KEY as string;
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;
const ENVIRONMENT = process.env.ENVIRONMENT || 'deployed'

export const initializeServer = async () => {
    const server = fastify();
    const baseUrl = 'https://discord.com/api/v10';

    await server.register(rawBody, {
        runFirst: true
    });

    interface ISecurityHeaders {
        'x-signature-ed25519': string;
        'x-signature-timestamp': string;
    }

    server.addHook<{
        Headers: ISecurityHeaders
    }>('preHandler', async (request, reply) => {
        if (request.method === 'POST') {
            const signature = request.headers['x-signature-ed25519'];
            const timestamp = request.headers['x-signature-timestamp'];

            const isValidRequest = request.rawBody ? verifyKey(
                request.rawBody,
                signature,
                timestamp,
                APP_PUBLIC_KEY
            ) : false;

            if (!isValidRequest) {
                console.error('Invalid request');

                return reply.status(401).send({error: 'Bad request signature'});
            }
        }
    });

    interface IInteractionsBody {
        type: InteractionType;
        data: {
            name: string;
            components: {
                components: {
                    custom_id: string;
                    type: number;
                    value: string;
                }[]
            }[]
        }
        id: string;
        token: string;
    }

    server.get('/status', async (_request, reply) => {
        return reply.send({status: 'OK'});
    });

    server.post<{
        Body: IInteractionsBody
    }>('/interactions', async (request, reply) => {
        const { type, data } = request.body;

        if (type === InteractionType.PING) {
            return reply.send({ type: InteractionResponseType.PONG })
        }

        if (type === InteractionType.APPLICATION_COMMAND) {
            const { name } = data;

            if (name === 'servo-validate') {
                const {
                    id: interactionId,
                    token: interactionToken
                } = request.body;

                const url = `${baseUrl}/interactions/${interactionId}/${interactionToken}/callback`;
                const body = {
                    type: InteractionResponseType.MODAL,
                    data: {
                        custom_id: 'validate-modal',
                        title: 'Validate your commander decklist!',
                        components: [
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 4,
                                        custom_id: 'validate-commander',
                                        style: 1,
                                        label: 'Commander',
                                        required: true
                                    },
                                ]
                            },
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 4,
                                        custom_id: 'validate-decklist',
                                        style: 2,
                                        label: 'Remaining 99 in your decklist'
                                    }
                                ]
                            }
                        ]
                    }
                }
                
                await fetch(url, {
                    headers: {
                        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
                        'Content-Type': 'application/json charset=UTF-8',
                        'User-Agent': 'DiscordBot (https://jaredgriffin.com, 0.1.0)'
                    },
                    method: 'POST',
                    body: JSON.stringify(body)
                });

                return reply.status(200).send({
                    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: 'This is validation.'
                    }
                });
            }
        }

        if (type === InteractionType.MODAL_SUBMIT) {
            const {
                id: interactionId,
                token: interactionToken
            } = request.body;

            const url = `${baseUrl}/interactions/${interactionId}/${interactionToken}/callback`;
            const body = {
                type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: 'Validating commander deck...'
                }
            }
            const discordHeaders = {
                Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
                'Content-Type': 'application/json charset=UTF-8',
                'User-Agent': 'DiscordBot (https://jaredgriffin.com, 0.1.0)'
            };
            
            await fetch(url, {
                headers: discordHeaders,
                method: 'POST',
                body: JSON.stringify(body)
            });

            const [commanderInput, decklistInput] = request.body.data.components.map((actionRowComponent) => actionRowComponent.components[0]);
            const commander = commanderInput.value.trim();
            const [decklist, decklistParsingErrors] = parseDecklistInput(decklistInput.value);
            const [decklistData, decklistInfoErrors] = await getDecklistInformation({
                commander,
                decklist
            });

            const rulesErrors = [
                isFormatLegal(MtgFormat.COMMANDER),
                isTotalBudgetExceeded(25),
                isCommanderValid(MtgFormat.COMMANDER),
                isCommanderBudgetExceeded(5),
                isDeckSizeMatchingFormat(MtgFormat.COMMANDER),
                isDecklistSingleton
            ].flatMap((ruleFunction) => ruleFunction(decklistData));

            const validationErrors = [
                ...decklistParsingErrors,
                ...decklistInfoErrors,
                ...rulesErrors
            ];

            const updateUrl = `${baseUrl}/webhooks/${APP_ID}/${interactionToken}`;

            if (validationErrors.length) {
                const errorsBody = {
                    content: `:x:  **VALIDATION FAILED**  :x:\n*See the errors below:*\n\n${validationErrors.map((validationError) => `- ${validationError}`).join('\n')}`
                };

                await fetch(updateUrl, {
                    headers: discordHeaders,
                    method: 'POST',
                    body: JSON.stringify(errorsBody)
                });
            } else {
                const validationSuccessMessage = {
                    content: ':white_check_mark:  **VALIDATION PASSED**  :white_check_mark:\n\nSee the attached CSV file for detailed information on your decklist.',
                    attachments: [{
                        id: 0,
                        filename: 'decklist-report.csv'
                    }]
                };
                const quantityOfCardsInDecklist = decklistData.decklist.reduce((quantity, cardData) => quantity + cardData.quantity, 1);
                const valueOfDecklist = getCardPrice((decklistData.commander as ICardData).prices) + decklistData.decklist.reduce((decklistTotalCost, cardData) => decklistTotalCost + getCardPrice(cardData.prices), 0);
                const decklistReportString = [
                    'Quantity,Name,Value,Scryfall Link',
                    'Commander',
                    createReportLine(decklistData.commander as ICardData),
                    'Remaining cards in decklist',
                    ...decklistData.decklist.map(createReportLine),
                    'Totals',
                    `${quantityOfCardsInDecklist},,$${valueOfDecklist}`
                ].join('\n');

                const successFormData = new FormData();

                successFormData.append('payload_json', JSON.stringify(validationSuccessMessage));
                successFormData.append('files[0]', stringToBlob(decklistReportString, 'text/csv'), 'decklist-report.csv');

                await fetch(updateUrl, {
                    headers: {
                        Authorization: discordHeaders.Authorization,
                        'User-Agent': discordHeaders['User-Agent']
                    },
                    method: 'POST',
                    body: successFormData
                });
            }

            return reply.status(200);
        }

        return reply.send({
            data: {
                content: `Request type: ${type}`
            }
        });
    });

    interface IUpdateQueryParameters {
        guildid: string;
    }

    server.get<{
        Querystring: IUpdateQueryParameters
    }>('/update', async (request, reply) => {
        const guildId = request.query.guildid;

        if (!guildId) {
            return reply.status(400).send({
                error: 'Please specify a guildId.'
            });
        }

        const url = `${baseUrl}/applications/${APP_ID}/guilds/${guildId}/commands`;

        console.log('the id', guildId);

        await Promise.all(Object.values(commands).map(async (command) => {
            const options = {
                headers: {
                    Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
                    'Content-Type': 'application/json charset=UTF-8',
                    'User-Agent': 'DiscordBot (https://jaredgriffin.com, 0.2.0)'
                },
                method: 'POST',
                body: JSON.stringify(command)
            };

            console.log('options', options);
            console.log('url', url);

            const response = await fetch(url, options);
        
            const parsedResponse = await response.json();
        
            if (!response.ok) {
                console.log(`BAD RESPONSE: ${response.status}`);
                console.log('response', JSON.stringify(parsedResponse));
        
                throw new Error(JSON.stringify(parsedResponse));
            }
        }));

        reply.code(201);
    });

    return server;
};

if (ENVIRONMENT !== 'deployed') {
    const server = await initializeServer();

    server.listen({port: PORT}, (error, address) => {
        if (error) {
            console.error(error);
            process.exit(1);
        }

        console.log(`Server listening at ${address}`);
    });
}
