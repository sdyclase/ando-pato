exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { image, mediaType } = JSON.parse(event.body);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: image }
            },
            {
              type: 'text',
              text: `Analiza esta imagen de una boleta o cuenta de restaurant/bar.
Extrae TODOS los productos con sus precios. La imagen puede ser de noche o con poca luz — haz tu mejor esfuerzo.
Responde SOLO con JSON válido, sin texto adicional ni markdown:
{"lugar":"nombre del local","productos":[{"id":1,"name":"nombre producto","price":12000}]}
Reglas:
- Precios en pesos chilenos como números enteros sin puntos ni comas
- Si un precio no se lee bien, estímalo basándote en el contexto
- Si hay items duplicados (ej: 2x cerveza), créalos como entradas separadas
- Si definitivamente no es una boleta responde: {"error":"no es una boleta"}`
            }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: clean
    };

  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: e.message })
    };
  }
};
