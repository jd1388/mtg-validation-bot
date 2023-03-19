import * as rulesConfigurations from './formats/custom-formats.js';

export enum CommandOptionType {
    STRING = 3
}

enum ApplicationCommandType {
    CHAT_INPUT = 1
}

export const validate = {
    name: 'servo-validate',
    description: 'Validate your Magic the Gathering deck list against a set of rules.',
    type: ApplicationCommandType.CHAT_INPUT,
    options: [{
        name: 'format',
        description: 'Rules format you would like Servo to validate your decklist against',
        type: CommandOptionType.STRING,
        required: true,
        choices: Object.values(rulesConfigurations).map((rulesConfiguration) => ({
            name: rulesConfiguration.displayName,
            value: rulesConfiguration.name
        }))
    }]
}
