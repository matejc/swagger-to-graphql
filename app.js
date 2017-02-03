const express = require('express');
const app = express();
const graphqlHTTP = require('express-graphql');
const graphQLSchema = require('./lib');
const {
    GraphQLObjectType,
    GraphQLString,
    GraphQLID
} = require('graphql');

let extraQueries = (queries) => {
    return {
        getPet: {
            type: new GraphQLObjectType({
                name: 'PetOut',
                fields: {
                    name: {
                        type: GraphQLString
                    },
                    id: {
                        type: GraphQLID
                    }
                }
            }),
            args: {
                id: {
                    type: GraphQLID
                }
            },
            resolve(_, args, opts) {
                return queries.getPetById.resolve(null, {
                    petId: String(args.id)
                }, opts);
            }
        }
    };
};

let extraMutations = (queries, mutations) => {
    return {
        doPetOrder: {
            type: queries.getPet.type,
            args: queries.getPet.args,
            resolve(a, args, opts) {
                return mutations.placeOrder.resolve(null, {body: { petId: args.id }}, opts)
                    .then(res => {
                        return queries.getPet.resolve(null, {
                            id: String(res.petId)
                        }, opts);
                    });
            }
        }
    };
};


graphQLSchema('./test/fixtures/petstore.json', {
    extraQueries,
    extraMutations
}).then(schema => {
    app.use('/graphql', graphqlHTTP(() => {
        return {
            schema,
            context: {
                GQLProxyBaseUrl: 'http://petstore.swagger.io/v2'
            },
            graphiql: true
        };
    }));

    app.listen(3009, 'localhost', () => {
        console.info(`http://localhost:3009/graphql`);
    });
}).catch(e => {
    console.log(e);
});
