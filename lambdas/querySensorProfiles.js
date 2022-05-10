'use strict';

const aws = require('aws-sdk');

const lambda = new aws.Lambda({
  apiVersion: "2015-03-31",
  region: process.env.REGION
});

module.exports.handle = async (event) => {
  const { vids = [], tenantId = process.env.TENANT_ID } = event;

  const async_lambda_invoke = async ({ function_name, payload }) => {
    console.log(`invoking function: ${function_name}`);

    const eventPayload = {
      headers: {
        Tenant: tenantId
      },
      requestContext: {
        identity: {
          accountId: process.env.ACCOUNT_ID,
          userArn: `arn:aws:iam::${process.env.ACCOUNT_ID}:user/${process.env.USER_ID}`
        }
      },
      body: JSON.stringify(payload)
    }

    return await lambda.invoke({
      FunctionName: function_name,
      InvocationType: "RequestResponse",
      Payload: JSON.stringify(eventPayload)
    }).promise();
  };

  const queryPayload = {
    sensorProfiles: {
      arguments: {
        filter: {
          propertyFilters: {
            vid: {
              op: "==",
              values: vids
            }
          }
        }
      },
      fields: ["id"]
    }
  }

  const queryResult = await async_lambda_invoke({
    function_name: `${process.env.X_GRAPH_PREFIX}-query`,
    payload: queryPayload
  });

  const sensorProfiles = JSON.parse(queryResult.Payload).body.map(sp => sp.id);

  console.log(sensorProfiles);

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
