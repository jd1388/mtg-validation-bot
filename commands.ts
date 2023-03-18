enum ApplicationCommandType {
    CHAT_INPUT = 1
}

export const validate = {
    name: 'servo-validate',
    description: 'Validate your Magic the Gathering deck list against a set of rules.',
    type: ApplicationCommandType.CHAT_INPUT
}
