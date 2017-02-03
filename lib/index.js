'use strict';

const rp = require('request-promise');
const {GraphQLSchema, GraphQLObjectType} = require('graphql');
const {getAllEndPoints, loadSchema} = require('./swagger');
const {createGQLObject, mapParametersToFields} = require('./type_map');
const _ = require('lodash');
const build = (swaggerPath, options) => {
  return loadSchema(swaggerPath).then(swaggerSchema => {
    const endpoints = getAllEndPoints(swaggerSchema);
    let queryFields = getQueriesFields(endpoints, false);
    if (_.isFunction(options.extraQueries)) {
      queryFields = _.defaults(queryFields, options.extraQueries(queryFields));
    }

    const rootType = new GraphQLObjectType({
      name: 'Query',
      fields: () => {
        return queryFields;
      }
    });

    const graphQLSchema = {
      query: rootType
    };

    let mutationFields = getQueriesFields(endpoints, true);

    if (_.isFunction(options.extraMutations)) {
      mutationFields = _.defaults(mutationFields, options.extraMutations(queryFields, mutationFields));
    }
    if (Object.keys(mutationFields).length) {
      graphQLSchema.mutation = new GraphQLObjectType({
        name: 'Mutation',
        fields: mutationFields
      });
    }

    return new GraphQLSchema(graphQLSchema);
  });
};

function resolver(endpoint) {
  return (_, args, opts) => {
    const req = endpoint.request(args, {
      // allow different base url per swagger path,
      // usefull if you have multiple APIs in one combined swagger file
      baseUrl: endpoint['x-api-url'] || opts.GQLProxyBaseUrl
    });
    req.json = true;
    return rp(req).then(res => {
      return res;
    }).catch(e => {
      throw e;
    });
  };
}

function getQueriesFields(endpoints, isMutation) {
  return Object.keys(endpoints).filter((typeName) => {
    return !!endpoints[typeName].mutation === !!isMutation;
  }).reduce((result, typeName) => {
    const endpoint = endpoints[typeName];
    const type = createGQLObject(endpoint.response, typeName, endpoint.location);
    result[typeName] = {
      type,
      description: endpoint.description,
      args: mapParametersToFields(endpoint.parameters, endpoint.location, typeName),
      resolve: resolver(endpoint)
    };
    return result;
  }, {});
}

module.exports = build;
