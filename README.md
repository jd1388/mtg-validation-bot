# MTG Validation Bot

*NOTE: WORK IN PROGRESS*

This is a Discord bot that can be used to validate that a MTG commander deck follows a specific budget. In the future, it will have different rulesets for different house rules.

## Scripts

**npm run dev**
- Runs a local development server

**npm run build**
- Compiles the Typescript code to Javascript

**npm run start**
- Run the compiled application

## Deployment

Deployments are made using SAM from AWS. Make sure to have both the AWS and SAM CLIs installed and configured with access tokens.

To deploy first, run `sam build` to build the image that will get deployed. Afterwards, run `sam deploy` to deploy the new image to AWS.
