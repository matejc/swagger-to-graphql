const express = require('express');
const app = express();
const graphqlHTTP = require('express-graphql');
const graphQLSchema = require('./lib');
const {
    GraphQLObjectType,
    GraphQLString,
    GraphQLID,
    GraphQLBoolean
} = require('graphql');

// Example query:
// {
//   petsInfo(petId: "1003632521") {
//     current {
//       name id
//     }
//     pending
//     sold
//   }
// }

let extraQueries = (queries) => {
    let PetOut = new GraphQLObjectType({
        name: 'PetOut',
        fields: {
            name: {
                type: GraphQLString
            },
            id: {
                type: GraphQLID
            }
        }
    });

    let PetIn = {
        petId: {
            type: GraphQLID
        }
    };

    let PetsInfoOut = new GraphQLObjectType({
        name: 'PetsInfoOut',
        fields: {
            current: {
                args: PetIn,
                type: PetOut,
                resolve: resolvePet
            },
            available: {
                type: GraphQLBoolean,
                resolve: resolveAvailable
            },
            pending: {
                type: GraphQLBoolean,
                resolve: resolvePending
            },
            sold: {
                type: GraphQLBoolean,
                resolve: resolveSold
            }
        }
    });

    function resolvePet(parent, args, opts) {
        if (parent) {
            return parent;
        }
        console.log('resolvePet: '+args.petId)
        return queries.getPetById.resolve(null, {
            petId: args.petId
        }, opts);
    }

    function resolveAvailable(parent, args, opts) {
        console.log('resolveAvailable')
        return queries.findPetsByStatus.resolve(null, {status: ['available']}, opts)
            .then(available => {
                for (let k in available) {
                    if (available[k].id === parent.id) {
                        return true;
                    }
                }
                return false;
            });
    }

    function resolvePending(parent, args, opts) {
        console.log('resolvePending')
        return queries.findPetsByStatus.resolve(null, {status: ['pending']}, opts)
            .then(pending => {
                for (let k in pending) {
                    if (pending[k].id === parent.id) {
                        return true;
                    }
                }
                return false;
            });
    }

    function resolveSold(parent, args, opts) {
        console.log('resolveSold')
        return queries.findPetsByStatus.resolve(null, {status: ['sold']}, opts)
            .then(sold => {
                for (let k in sold) {
                    if (sold[k].id === parent.id) {
                        return true;
                    }
                }
                return false;
            });
    }

    return {
        getPet: {
            type: PetOut,
            args: PetIn,
            resolve: resolvePet
        },
        petsInfo: {
            type: PetsInfoOut,
            args: PetIn,
            resolve: resolvePet
        }
    };
};

let extraMutations = (queries, mutations) => {
    return {
        doPetOrder: {
            type: queries.getPet.type,
            args: queries.getPet.args,
            resolve(a, args, opts) {
                return mutations.placeOrder.resolve(null, {body: { petId: args.petId }}, opts)
                    .then(res => {
                        return queries.getPet.resolve(null, {
                            petId: String(res.petId)
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
