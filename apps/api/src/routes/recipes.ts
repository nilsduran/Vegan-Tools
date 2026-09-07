/**
 * @file recipes.ts
 * @description API endpoint for culinary recipe veganization.
 * Takes traditional recipes and uses the domain knowledge base to identify animal ingredients and suggest plant-based substitutes.
 */

import type { FastifyInstance } from "fastify";
import { veganizeRecipe } from "@vegan-tools/domain";

export async function recipeRoutes(app: FastifyInstance) {
  app.post<{ Body: { recipeText?: string } }>(
    "/v1/recipes/veganize",
    async (request, reply) => {
      if (!request.body?.recipeText?.trim()) {
        return reply.code(400).send({
          code: "RECIPE_REQUIRED",
          message: "Paste a recipe with its ingredients.",
        });
      }
      return veganizeRecipe(request.body.recipeText);
    },
  );
}
