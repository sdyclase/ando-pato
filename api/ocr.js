export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { image, mediaType } = body;

    if (!image || !mediaType) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: image }
            },
            {
              type: 'text',
              text: `Analiza esta boleta o cuenta de restaurant/bar chileno. Extrae TODOS los productos con sus precios.
La imagen puede ser de noche o con poca luz — haz tu mejor esfuerzo.

Reglas importantes:
- Incluye TODOS los productos, incluso los que tienen precio 0 (son items incluidos en combos o promociones)
- Los items con precio 0 son válidos — inclúyelos con price: 0
- Si un producto dice "+Coca Cola" o similar con precio 0, inclúyelo igual
- Precios en pesos chilenos como números enteros sin puntos ni comas (ej: 4700 no 4.700)
- Si hay items duplicados, créalos como entradas separadas con IDs distintos
- Ignora líneas de totales, subtotales, propina sugerida — solo productos individuales
- Si definitivamente no es una boleta responde: {"error":"no es una boleta"}

Responde SOLO con JSON válido, sin texto adicional ni markdown:
{"lugar":"nombre del local","productos":[{"id":1,"name":"nombre producto","price":4700},{"id":2,"name":"+Coca Cola","price":0}]}`
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: 'Anthropic error: ' + errText.substring(0, 200) });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
