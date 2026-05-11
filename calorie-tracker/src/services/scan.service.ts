/**
 * Scan Service — Image-based Food Recognition via OpenAI GPT-4o Vision
 *
 * Sends a base64-encoded food photo to GPT-4o with a structured JSON prompt.
 * GPT-4o identifies the food and estimates nutritional values per serving.
 * Falls back to demo mode when the API key is not configured or the call fails.
 */

import { FoodRecognitionResponse } from '@/src/types';

// ── API Configuration ────────────────────────────────────────────────────────
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_KEY ?? '';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

function isOpenAIConfigured(): boolean {
    return Boolean(OPENAI_API_KEY) && OPENAI_API_KEY.startsWith('sk-');
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert nutritionist and food recognition AI with extensive knowledge of world cuisines including South Asian, Sri Lankan, Indian, East Asian, Western, and Middle Eastern foods.

When given a food image:
1. CAREFULLY examine all visual details — colour, texture, shape, cooking style, garnishes, and plating.
2. Identify the SPECIFIC food item (e.g. "Chicken Biryani" not just "Rice", "Masala Dosa" not just "Pancake").
3. If you are unsure, lean towards the most visually plausible option and set confidence accordingly.
4. Estimate realistic nutritional values for ONE standard serving based on common recipes.
5. Provide 2–3 visually similar alternatives the image could represent, with their confidence and calories.

Critical rules:
- Be SPECIFIC: prefer specific dish names over generic categories.
- Base confidence on how clearly the food is visible (low quality photo → lower confidence).
- Nutritional values must be realistic for the identified dish.
- Respond ONLY with a valid JSON object — no markdown fences, no explanation text.

JSON schema:
{
  "food_name": string,
  "confidence": number (0.0–1.0),
  "serving_size": number,
  "serving_unit": string,
  "calories_per_serving": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "alternatives": [
    { "food_name": string, "confidence": number, "calories_per_serving": number }
  ]
}`;

// ── OpenAI API response types ─────────────────────────────────────────────────
interface OpenAIMessage {
    role: string;
    content: string;
}

interface OpenAIChoice {
    message: OpenAIMessage;
    finish_reason: string;
}

interface OpenAIResponse {
    choices: OpenAIChoice[];
}

// ── Demo data (shown when API key is not set or the call fails) ───────────────
const DEMO_FOODS: FoodRecognitionResponse[] = [
    {
        food_name: 'Pizza Margherita',
        confidence: 0.94,
        calories_per_serving: 266,
        serving_size: 1,
        serving_unit: 'slice',
        protein_g: 11,
        carbs_g: 33,
        fat_g: 10,
        alternatives: [
            { food_name: 'Bruschetta', confidence: 0.12, calories_per_serving: 120 },
            { food_name: 'Garlic Bread', confidence: 0.08, calories_per_serving: 206 },
        ],
    },
    {
        food_name: 'Caesar Salad',
        confidence: 0.91,
        calories_per_serving: 180,
        serving_size: 1,
        serving_unit: 'bowl',
        protein_g: 7,
        carbs_g: 8,
        fat_g: 14,
        alternatives: [
            { food_name: 'Greek Salad', confidence: 0.85, calories_per_serving: 150 },
            { food_name: 'Caprese Salad', confidence: 0.78, calories_per_serving: 200 },
        ],
    },
    {
        food_name: 'Hamburger',
        confidence: 0.92,
        calories_per_serving: 354,
        serving_size: 1,
        serving_unit: 'burger',
        protein_g: 20,
        carbs_g: 29,
        fat_g: 17,
        alternatives: [
            { food_name: 'Club Sandwich', confidence: 0.14, calories_per_serving: 460 },
            { food_name: 'Pulled Pork Sandwich', confidence: 0.10, calories_per_serving: 460 },
        ],
    },
    {
        food_name: 'Chicken Biryani',
        confidence: 0.93,
        calories_per_serving: 290,
        serving_size: 200,
        serving_unit: 'g',
        protein_g: 16,
        carbs_g: 38,
        fat_g: 8,
        alternatives: [
            { food_name: 'Fried Rice', confidence: 0.22, calories_per_serving: 328 },
            { food_name: 'Pulao', confidence: 0.18, calories_per_serving: 240 },
        ],
    },
    {
        food_name: 'Sushi',
        confidence: 0.95,
        calories_per_serving: 200,
        serving_size: 6,
        serving_unit: 'pieces',
        protein_g: 9,
        carbs_g: 30,
        fat_g: 5,
        alternatives: [
            { food_name: 'Sashimi', confidence: 0.88, calories_per_serving: 130 },
            { food_name: 'Gyoza', confidence: 0.12, calories_per_serving: 230 },
        ],
    },
];

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Recognise food from a base64-encoded JPEG/PNG image.
 *
 * Sends the image to GPT-4o Vision and returns structured nutrition data.
 * Automatically falls back to demo mode when the API key is absent or the
 * call fails, so the rest of the app never sees an unhandled rejection.
 */
export async function recognizeFood(base64Image: string): Promise<FoodRecognitionResponse> {
    if (!isOpenAIConfigured()) {
        console.log('ℹ️  EXPO_PUBLIC_OPENAI_KEY not set — using demo mode');
        return getDemoResult();
    }

    try {
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                max_tokens: 600,
                temperature: 0,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${base64Image}`,
                                    detail: 'high',
                                },
                            },
                            {
                                type: 'text',
                                text: 'Look carefully at this food photo. What specific dish is this? Return the nutrition JSON.',
                            },
                        ],
                    },
                ],
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`OpenAI API error ${response.status}: ${errText}`);
        }

        const data: OpenAIResponse = await response.json();
        const rawText = data.choices?.[0]?.message?.content ?? '';
        return parseOpenAIResponse(rawText);
    } catch (error) {
        console.warn('OpenAI Vision scan failed, falling back to demo:', error);
        return getDemoResult();
    }
}

/**
 * Parse the raw text returned by GPT-4o into a FoodRecognitionResponse.
 * Strips any accidental markdown code fences before JSON.parse.
 */
function parseOpenAIResponse(raw: string): FoodRecognitionResponse {
    try {
        // Strip ```json … ``` wrappers that the model occasionally adds
        const cleaned = raw
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/, '')
            .trim();

        const parsed = JSON.parse(cleaned);

        return {
            food_name: String(parsed.food_name ?? 'Unknown Food'),
            confidence: Number(parsed.confidence ?? 0.8),
            calories_per_serving: Math.round(Number(parsed.calories_per_serving ?? 200)),
            serving_size: Number(parsed.serving_size ?? 1),
            serving_unit: String(parsed.serving_unit ?? 'serving'),
            protein_g: Math.round(Number(parsed.protein_g ?? 0) * 10) / 10,
            carbs_g: Math.round(Number(parsed.carbs_g ?? 0) * 10) / 10,
            fat_g: Math.round(Number(parsed.fat_g ?? 0) * 10) / 10,
            alternatives: Array.isArray(parsed.alternatives)
                ? parsed.alternatives.slice(0, 3).map((a: any) => ({
                    food_name: String(a.food_name ?? ''),
                    confidence: Number(a.confidence ?? 0),
                    calories_per_serving: Math.round(Number(a.calories_per_serving ?? 0)),
                }))
                : [],
        };
    } catch {
        console.warn('Failed to parse OpenAI response JSON, using demo result');
        return getDemoResult();
    }
}

/**
 * Return a random demo scan result (used in dev / when API is unavailable).
 */
export function getDemoResult(): FoodRecognitionResponse {
    return DEMO_FOODS[Math.floor(Math.random() * DEMO_FOODS.length)];
}

/**
 * Compress and convert a local file URI to a base64 string.
 * Used when expo-camera does not return base64 directly.
 */
export async function prepareImageForScan(uri: string): Promise<string> {
    try {
        const response = await fetch(uri);
        const blob = await response.blob();

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                // Strip the data URL prefix if present
                const base64 = result.includes(',') ? result.split(',')[1] : result;
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch {
        return '';
    }
}
