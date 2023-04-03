import 'dotenv/config';
import fastify from 'fastify';
import {
    InteractionType,
    InteractionResponseType,
    verifyKey
} from 'discord-interactions';
import rawBody from 'fastify-raw-body';

import * as commands from './commands.js';
import { getCardPrice } from './utils/card-data-utilities.js';
import { ICardData, getDecklistInformation, parseCommanderInput, parseDecklistInput } from './services/decklist-service.js';
import { createErrorMessages, createReportLine, stringToBlob } from './utils/message-utilities.js';
import { parseFormatConfiguration } from './formats/format-parser.js';
import * as customFormats from './formats/custom-formats.js';

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
            }[];
            options: {
                name: string;
                type: number;
                value: string;
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
                const selectedFormat = data.options[0].value

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
                                        custom_id: 'validate-format',
                                        style: 1,
                                        label: 'Format to validate against (Leave alone)',
                                        required: true,
                                        value: selectedFormat
                                    }
                                ]
                            },
                            {
                                type: 1,
                                components: [
                                    {
                                        type: 4,
                                        custom_id: 'validate-commander',
                                        style: 2,
                                        label: 'Commander(s)',
                                        placeholder: 'Wilson, Refined Grizzly\nRaised by Giants',
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
                                        label: 'Remaining decklist',
                                        placeholder: '1 Sword of the Animist\n1 Arcane Signet\n30 Forest',
                                        required: true
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

            const [formatInput, commanderInput, decklistInput] = request.body.data.components.map((actionRowComponent) => actionRowComponent.components[0]);
            const commander = parseCommanderInput(commanderInput.value);
            const [decklist, decklistParsingErrors] = parseDecklistInput(decklistInput.value);
            const [decklistData, decklistInfoErrors] = await getDecklistInformation({
                commander,
                decklist
            });

            const format = formatInput.value.trim();
            const formatConfiguration = Object.values(customFormats).find((customFormat) => customFormat.name === format);

            const updateUrl = `${baseUrl}/webhooks/${APP_ID}/${interactionToken}`;

            if (!formatConfiguration) {
                const errorsBody = {
                    content: `:x:  **INVALID RULES FORMAT**  :x:\nThe rules format you chose does not exist. Please try again and select one of the options provided.`
                };

                await fetch(updateUrl, {
                    headers: discordHeaders,
                    method: 'POST',
                    body: JSON.stringify(errorsBody)
                });

                return reply.status(200);
            }

            const rules = parseFormatConfiguration(formatConfiguration).rules;

            const rulesErrors = rules.flatMap((ruleFunction) => ruleFunction(decklistData));

            const validationErrors = [
                ...decklistParsingErrors,
                ...decklistInfoErrors,
                ...rulesErrors
            ];

            if (validationErrors.length) {
                const [firstErrorMessage] = createErrorMessages(validationErrors);
                const firstErrorMessagePrefix = ':x:  **VALIDATION FAILED**  :x:\n*See the errors below:*\n\n';
                const errorsBody = {
                    content: `${firstErrorMessagePrefix}${firstErrorMessage}`
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
                const valueOfDecklist = decklistData.commander.reduce((commanderTotalCost, cardData) => getCardPrice(cardData.prices) + commanderTotalCost, 0) + decklistData.decklist.reduce((decklistTotalCost, cardData) => cardData.type_line.toLowerCase().includes('basic') ? decklistTotalCost : decklistTotalCost + (cardData.quantity * getCardPrice(cardData.prices)), 0);
                const decklistReportString = [
                    `Format:,"${formatConfiguration.displayName}"`,
                    'Quantity,Name,Value,Scryfall Link',
                    'Commander',
                    ...decklistData.commander.map(createReportLine),
                    'Remaining cards in decklist',
                    ...decklistData.decklist.map(createReportLine),
                    'Totals',
                    `${quantityOfCardsInDecklist},,$${valueOfDecklist.toFixed(2)}`
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
