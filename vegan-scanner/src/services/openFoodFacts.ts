export interface ProductResult {
  status: 'vegan' | 'vegetarian' | 'non-vegetarian' | 'unknown';
  reason: string;
  productName?: string;
  image?: string;
  barcode?: string;
}

export async function checkBarcode(barcode: string): Promise<ProductResult | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,image_front_url,ingredients_analysis_tags`, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      return null; // Handle HTTP errors (like 404 or 500) gracefully
    }

    const data = await res.json();

    if (data.status !== 1) {
      return null; // Product not found
    }

    const product = data.product;
    const tags = product.ingredients_analysis_tags || [];
    
    const isVegan = tags.includes('en:vegan');
    const isNonVegan = tags.includes('en:non-vegan');
    const isVegetarian = tags.includes('en:vegetarian');
    const isNonVegetarian = tags.includes('en:non-vegetarian');

    let status: ProductResult['status'] = 'unknown';
    let reason = 'No s\'ha pogut determinar des de la base de dades.';

    if (isVegan) {
      status = 'vegan';
      reason = 'L\'anàlisi dels ingredients indica que és vegà.';
    } else if (isNonVegan && isNonVegetarian) {
      status = 'non-vegetarian';
      reason = 'Conté ingredients no vegetarians.';
    } else if (isNonVegan && isVegetarian) {
      status = 'vegetarian';
      reason = 'Conté productes d\'origen animal (com llet/ous) però no carn.';
    } else if (isNonVegan) {
      status = 'non-vegetarian';
      reason = 'Conté ingredients no vegans.';
    } else if (isVegetarian) {
      status = 'vegetarian';
      reason = 'L\'anàlisi dels ingredients indica que és vegetarià.';
    } else if (tags.includes('en:vegan-status-unknown') || tags.includes('en:vegetarian-status-unknown')) {
      status = 'unknown';
      reason = 'L\'estat és desconegut a la base de dades. Pots escanejar la llista d\'ingredients en el seu lloc.';
    }

    return {
      status,
      reason,
      productName: product.product_name,
      image: product.image_front_url,
      barcode
    };

  } catch (error) {
    // OpenFoodFacts often returns 404s without CORS headers, which causes a NetworkError.
    // Since we have Gemini as a fallback, we can silently ignore this error.
    return null;
  }
}
