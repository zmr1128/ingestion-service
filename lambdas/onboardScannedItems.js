'use strict';

const epcParser = require('node-epc');
const aws = require('aws-sdk');

const lambda = new aws.Lambda({
  apiVersion: "2015-03-31",
  region: process.env.REGION
});

module.exports.handle = async (event) => {
  const { tags, tenantId = process.env.TENANT_ID } = event;

  const rfidTags = tags.map((tag) => tag['EPC-96']);
  const itemsPayload = [];

  for (const tag of rfidTags) {
    const parsedDataObject = await epcParser.parse(tag);

    const item_number = parsedDataObject.parts.ItemReference.toString();
    const tracker_serial = tag;

    const itemPayload = {
      item_number,
      tracker_serial,
      name: tracker_serial
    }

    itemsPayload.push(itemPayload);
  }

  const async_lambda_invoke = async ({ function_name, payload }) => {
    console.log(`invoking function: ${function_name}`);

    const identity = { tenantId }

    const eventPayload = {
      identity,
      payload
      ignoreExistingItem: true
    }

    return await lambda.invoke({
      FunctionName: function_name,
      InvocationType: "RequestResponse",
      Payload: JSON.stringify(eventPayload)
    }).promise();
  };

  const invokePromises = [];

  while (itemsPayload.length) {
    const itemsPayloadPartial = itemsPayload.splice(0,25);

    const functionInvokePromise = async_lambda_invoke({
      function_name: `${process.env.X_GRAPH_PREFIX}-createItemSet`,
      payload: itemsPayloadPartial
    });

    invokePromises.push(functionInvokePromise);
  }

  const results = await Promise.all(invokePromises);

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: 'executed successfully!',
        input: event,
      },
      null,
      2
    ),
  };

};
