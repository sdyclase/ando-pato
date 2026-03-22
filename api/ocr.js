export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image, mediaType } = req.body;

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
Extrae TODOS los productos con sus precios. La imagen puede ser de noche o con poca luz — haz tu mejor esfuerzo para leerla.
Responde SOLO con JSON válido, sin texto adicional ni markdown:
{"lugar":"nombre del local","productos":[{"id":1,"name":"nombre producto","price":12000}]}
Reglas:
- Precios en pesos chilenos como números enteros sin puntos ni comas
- Si un precio no se lee bien, estímalo basándote en el contexto
- Si hay items duplicados (ej: 2x cerveza), créalos como entradas separadas con el mismo precio
- Si definitivamente no es una boleta responde: {"error":"no es una boleta"}`
            }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    res.status(200).json(parsed);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
