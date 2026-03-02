import { GraphQLClient } from "graphql-request";
import { getSubgraphUrl } from "../constants";

let client: GraphQLClient | null = null;

export function getClient(): GraphQLClient {
  if (!client) {
    client = new GraphQLClient(getSubgraphUrl());
  }
  return client;
}
