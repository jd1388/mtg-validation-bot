import awsLambdaFastify from "@fastify/aws-lambda";

import { initializeServer } from "./app.js";

export const handler = awsLambdaFastify(await initializeServer())
