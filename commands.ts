enum ApplicationCommandType {
    CHAT_INPUT = 1
}

export const test = {
    name: 'test',
    description: 'Basic guild command',
    type: ApplicationCommandType.CHAT_INPUT
};

export const validate = {
    name: 'validate',
    description: 'Validate a MTG deck list',
    type: ApplicationCommandType.CHAT_INPUT
}
