FROM public.ecr.aws/lambda/nodejs:18

COPY . .

RUN npm i

CMD [ "dist/lambda.handler" ]
