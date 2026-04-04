/**
 * Scan Service — Image-based Food Recognition via Hugging Face Inference API
 *
 * Handles:
 * - Image capture / compression → base64
 * - Sending to Hugging Face Inference API (fine-tuned ViT model)
 * - Parsing results + nutrition lookup for Food-101 classes
 * - Graceful fallback to demo mode when API is not configured
 */

import { FoodRecognitionResponse } from '@/src/types';

// ============================================================
// API Configuration (loaded from .env)
// ============================================================
const HF_API_URL = process.env.EXPO_PUBLIC_HF_API_URL ?? '';
const HF_API_TOKEN = process.env.EXPO_PUBLIC_HF_API_TOKEN ?? '';

/**
 * Check if the Hugging Face API is configured
 */
function isHFConfigured(): boolean {
    return Boolean(HF_API_URL) && !HF_API_URL.includes('YOUR_');
}

// ============================================================
// Hugging Face Inference API Types
// ============================================================
interface HFClassificationResult {
    label: string;
    score: number;
}

// ============================================================
// Nutrition Data for Food-101 Classes
// Approximate per-serving values (calories, protein, carbs, fat)
// ============================================================
interface NutritionInfo {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    serving_size: number;
    serving_unit: string;
}

const FOOD_NUTRITION: Record<string, NutritionInfo> = {
    'Apple Pie': { calories: 296, protein_g: 2, carbs_g: 43, fat_g: 14, serving_size: 1, serving_unit: 'slice' },
    'Baby Back Ribs': { calories: 340, protein_g: 24, carbs_g: 15, fat_g: 22, serving_size: 3, serving_unit: 'ribs' },
    'Baklava': { calories: 334, protein_g: 5, carbs_g: 29, fat_g: 23, serving_size: 1, serving_unit: 'piece' },
    'Beef Carpaccio': { calories: 182, protein_g: 22, carbs_g: 1, fat_g: 10, serving_size: 100, serving_unit: 'g' },
    'Beef Tartare': { calories: 197, protein_g: 21, carbs_g: 2, fat_g: 12, serving_size: 100, serving_unit: 'g' },
    'Beet Salad': { calories: 120, protein_g: 3, carbs_g: 18, fat_g: 5, serving_size: 1, serving_unit: 'bowl' },
    'Beignets': { calories: 306, protein_g: 5, carbs_g: 37, fat_g: 15, serving_size: 2, serving_unit: 'pieces' },
    'Bibimbap': { calories: 490, protein_g: 22, carbs_g: 70, fat_g: 14, serving_size: 1, serving_unit: 'bowl' },
    'Bread Pudding': { calories: 296, protein_g: 7, carbs_g: 46, fat_g: 10, serving_size: 1, serving_unit: 'serving' },
    'Breakfast Burrito': { calories: 420, protein_g: 18, carbs_g: 40, fat_g: 22, serving_size: 1, serving_unit: 'burrito' },
    'Bruschetta': { calories: 120, protein_g: 3, carbs_g: 14, fat_g: 6, serving_size: 2, serving_unit: 'pieces' },
    'Caesar Salad': { calories: 180, protein_g: 7, carbs_g: 8, fat_g: 14, serving_size: 1, serving_unit: 'bowl' },
    'Cannoli': { calories: 230, protein_g: 5, carbs_g: 26, fat_g: 12, serving_size: 1, serving_unit: 'piece' },
    'Caprese Salad': { calories: 200, protein_g: 12, carbs_g: 6, fat_g: 15, serving_size: 1, serving_unit: 'plate' },
    'Carrot Cake': { calories: 415, protein_g: 5, carbs_g: 52, fat_g: 22, serving_size: 1, serving_unit: 'slice' },
    'Ceviche': { calories: 130, protein_g: 18, carbs_g: 8, fat_g: 3, serving_size: 1, serving_unit: 'bowl' },
    'Cheese Plate': { calories: 380, protein_g: 22, carbs_g: 2, fat_g: 32, serving_size: 1, serving_unit: 'plate' },
    'Cheesecake': { calories: 340, protein_g: 6, carbs_g: 26, fat_g: 24, serving_size: 1, serving_unit: 'slice' },
    'Chicken Curry': { calories: 310, protein_g: 24, carbs_g: 18, fat_g: 16, serving_size: 1, serving_unit: 'bowl' },
    'Chicken Quesadilla': { calories: 460, protein_g: 28, carbs_g: 34, fat_g: 24, serving_size: 1, serving_unit: 'quesadilla' },
    'Chicken Wings': { calories: 430, protein_g: 36, carbs_g: 8, fat_g: 28, serving_size: 6, serving_unit: 'wings' },
    'Chocolate Cake': { calories: 370, protein_g: 5, carbs_g: 52, fat_g: 17, serving_size: 1, serving_unit: 'slice' },
    'Chocolate Mousse': { calories: 250, protein_g: 5, carbs_g: 30, fat_g: 14, serving_size: 1, serving_unit: 'cup' },
    'Churros': { calories: 237, protein_g: 3, carbs_g: 30, fat_g: 12, serving_size: 3, serving_unit: 'pieces' },
    'Clam Chowder': { calories: 250, protein_g: 10, carbs_g: 20, fat_g: 14, serving_size: 1, serving_unit: 'bowl' },
    'Club Sandwich': { calories: 460, protein_g: 28, carbs_g: 36, fat_g: 22, serving_size: 1, serving_unit: 'sandwich' },
    'Crab Cakes': { calories: 280, protein_g: 18, carbs_g: 14, fat_g: 16, serving_size: 2, serving_unit: 'cakes' },
    'Creme Brulee': { calories: 290, protein_g: 4, carbs_g: 28, fat_g: 18, serving_size: 1, serving_unit: 'ramekin' },
    'Croque Madame': { calories: 520, protein_g: 26, carbs_g: 32, fat_g: 32, serving_size: 1, serving_unit: 'sandwich' },
    'Cup Cakes': { calories: 305, protein_g: 3, carbs_g: 40, fat_g: 15, serving_size: 1, serving_unit: 'cupcake' },
    'Deviled Eggs': { calories: 63, protein_g: 4, carbs_g: 0.5, fat_g: 5, serving_size: 2, serving_unit: 'halves' },
    'Donuts': { calories: 253, protein_g: 3, carbs_g: 31, fat_g: 14, serving_size: 1, serving_unit: 'donut' },
    'Dumplings': { calories: 260, protein_g: 10, carbs_g: 34, fat_g: 9, serving_size: 6, serving_unit: 'pieces' },
    'Edamame': { calories: 120, protein_g: 12, carbs_g: 9, fat_g: 5, serving_size: 1, serving_unit: 'cup' },
    'Eggs Benedict': { calories: 550, protein_g: 28, carbs_g: 30, fat_g: 36, serving_size: 1, serving_unit: 'serving' },
    'Escargots': { calories: 170, protein_g: 15, carbs_g: 2, fat_g: 12, serving_size: 6, serving_unit: 'pieces' },
    'Falafel': { calories: 330, protein_g: 13, carbs_g: 32, fat_g: 18, serving_size: 4, serving_unit: 'pieces' },
    'Filet Mignon': { calories: 280, protein_g: 40, carbs_g: 0, fat_g: 12, serving_size: 1, serving_unit: 'filet' },
    'Fish And Chips': { calories: 585, protein_g: 22, carbs_g: 52, fat_g: 32, serving_size: 1, serving_unit: 'serving' },
    'Foie Gras': { calories: 462, protein_g: 11, carbs_g: 5, fat_g: 44, serving_size: 100, serving_unit: 'g' },
    'French Fries': { calories: 365, protein_g: 4, carbs_g: 46, fat_g: 18, serving_size: 1, serving_unit: 'serving' },
    'French Onion Soup': { calories: 310, protein_g: 14, carbs_g: 26, fat_g: 16, serving_size: 1, serving_unit: 'bowl' },
    'French Toast': { calories: 340, protein_g: 10, carbs_g: 42, fat_g: 14, serving_size: 2, serving_unit: 'slices' },
    'Fried Calamari': { calories: 310, protein_g: 14, carbs_g: 24, fat_g: 18, serving_size: 1, serving_unit: 'serving' },
    'Fried Rice': { calories: 328, protein_g: 8, carbs_g: 48, fat_g: 12, serving_size: 1, serving_unit: 'plate' },
    'Frozen Yogurt': { calories: 160, protein_g: 4, carbs_g: 30, fat_g: 3, serving_size: 1, serving_unit: 'cup' },
    'Garlic Bread': { calories: 206, protein_g: 5, carbs_g: 24, fat_g: 10, serving_size: 2, serving_unit: 'slices' },
    'Gnocchi': { calories: 250, protein_g: 6, carbs_g: 50, fat_g: 2, serving_size: 1, serving_unit: 'plate' },
    'Greek Salad': { calories: 150, protein_g: 5, carbs_g: 10, fat_g: 10, serving_size: 1, serving_unit: 'bowl' },
    'Grilled Cheese Sandwich': { calories: 366, protein_g: 14, carbs_g: 28, fat_g: 22, serving_size: 1, serving_unit: 'sandwich' },
    'Grilled Salmon': { calories: 280, protein_g: 34, carbs_g: 0, fat_g: 15, serving_size: 1, serving_unit: 'fillet' },
    'Guacamole': { calories: 160, protein_g: 2, carbs_g: 9, fat_g: 14, serving_size: 0.5, serving_unit: 'cup' },
    'Gyoza': { calories: 230, protein_g: 9, carbs_g: 28, fat_g: 9, serving_size: 5, serving_unit: 'pieces' },
    'Hamburger': { calories: 354, protein_g: 20, carbs_g: 29, fat_g: 17, serving_size: 1, serving_unit: 'burger' },
    'Hot And Sour Soup': { calories: 160, protein_g: 8, carbs_g: 12, fat_g: 8, serving_size: 1, serving_unit: 'bowl' },
    'Hot Dog': { calories: 310, protein_g: 12, carbs_g: 28, fat_g: 18, serving_size: 1, serving_unit: 'hot dog' },
    'Huevos Rancheros': { calories: 420, protein_g: 18, carbs_g: 36, fat_g: 22, serving_size: 1, serving_unit: 'plate' },
    'Hummus': { calories: 166, protein_g: 8, carbs_g: 14, fat_g: 10, serving_size: 0.5, serving_unit: 'cup' },
    'Ice Cream': { calories: 267, protein_g: 5, carbs_g: 32, fat_g: 14, serving_size: 1, serving_unit: 'cup' },
    'Lasagna': { calories: 380, protein_g: 22, carbs_g: 36, fat_g: 16, serving_size: 1, serving_unit: 'piece' },
    'Lobster Bisque': { calories: 330, protein_g: 14, carbs_g: 18, fat_g: 22, serving_size: 1, serving_unit: 'bowl' },
    'Lobster Roll Sandwich': { calories: 420, protein_g: 28, carbs_g: 32, fat_g: 20, serving_size: 1, serving_unit: 'roll' },
    'Macaroni And Cheese': { calories: 380, protein_g: 14, carbs_g: 40, fat_g: 18, serving_size: 1, serving_unit: 'bowl' },
    'Macarons': { calories: 90, protein_g: 1.5, carbs_g: 14, fat_g: 3.5, serving_size: 2, serving_unit: 'pieces' },
    'Miso Soup': { calories: 60, protein_g: 4, carbs_g: 8, fat_g: 2, serving_size: 1, serving_unit: 'bowl' },
    'Mussels': { calories: 172, protein_g: 24, carbs_g: 7, fat_g: 5, serving_size: 1, serving_unit: 'serving' },
    'Nachos': { calories: 510, protein_g: 15, carbs_g: 48, fat_g: 30, serving_size: 1, serving_unit: 'plate' },
    'Omelette': { calories: 280, protein_g: 20, carbs_g: 2, fat_g: 22, serving_size: 1, serving_unit: 'omelette' },
    'Onion Rings': { calories: 340, protein_g: 5, carbs_g: 40, fat_g: 18, serving_size: 8, serving_unit: 'rings' },
    'Oysters': { calories: 80, protein_g: 8, carbs_g: 5, fat_g: 3, serving_size: 6, serving_unit: 'pieces' },
    'Pad Thai': { calories: 380, protein_g: 14, carbs_g: 50, fat_g: 14, serving_size: 1, serving_unit: 'plate' },
    'Paella': { calories: 420, protein_g: 22, carbs_g: 55, fat_g: 12, serving_size: 1, serving_unit: 'bowl' },
    'Pancakes': { calories: 350, protein_g: 8, carbs_g: 52, fat_g: 12, serving_size: 3, serving_unit: 'pancakes' },
    'Panna Cotta': { calories: 280, protein_g: 4, carbs_g: 30, fat_g: 16, serving_size: 1, serving_unit: 'serving' },
    'Peking Duck': { calories: 340, protein_g: 24, carbs_g: 12, fat_g: 22, serving_size: 1, serving_unit: 'serving' },
    'Pho': { calories: 350, protein_g: 20, carbs_g: 42, fat_g: 10, serving_size: 1, serving_unit: 'bowl' },
    'Pizza': { calories: 266, protein_g: 11, carbs_g: 33, fat_g: 10, serving_size: 1, serving_unit: 'slice' },
    'Pork Chop': { calories: 280, protein_g: 32, carbs_g: 0, fat_g: 16, serving_size: 1, serving_unit: 'chop' },
    'Poutine': { calories: 510, protein_g: 14, carbs_g: 52, fat_g: 28, serving_size: 1, serving_unit: 'serving' },
    'Prime Rib': { calories: 400, protein_g: 38, carbs_g: 0, fat_g: 26, serving_size: 1, serving_unit: 'slice' },
    'Pulled Pork Sandwich': { calories: 460, protein_g: 30, carbs_g: 38, fat_g: 20, serving_size: 1, serving_unit: 'sandwich' },
    'Ramen': { calories: 436, protein_g: 18, carbs_g: 60, fat_g: 14, serving_size: 1, serving_unit: 'bowl' },
    'Ravioli': { calories: 290, protein_g: 12, carbs_g: 38, fat_g: 10, serving_size: 1, serving_unit: 'plate' },
    'Red Velvet Cake': { calories: 366, protein_g: 5, carbs_g: 48, fat_g: 18, serving_size: 1, serving_unit: 'slice' },
    'Risotto': { calories: 350, protein_g: 8, carbs_g: 50, fat_g: 12, serving_size: 1, serving_unit: 'bowl' },
    'Samosa': { calories: 262, protein_g: 5, carbs_g: 28, fat_g: 14, serving_size: 2, serving_unit: 'pieces' },
    'Sashimi': { calories: 130, protein_g: 26, carbs_g: 0, fat_g: 3, serving_size: 5, serving_unit: 'pieces' },
    'Scallops': { calories: 150, protein_g: 20, carbs_g: 6, fat_g: 5, serving_size: 5, serving_unit: 'scallops' },
    'Seaweed Salad': { calories: 70, protein_g: 1, carbs_g: 12, fat_g: 2, serving_size: 1, serving_unit: 'bowl' },
    'Shrimp And Grits': { calories: 420, protein_g: 22, carbs_g: 42, fat_g: 18, serving_size: 1, serving_unit: 'bowl' },
    'Spaghetti Bolognese': { calories: 370, protein_g: 18, carbs_g: 52, fat_g: 10, serving_size: 1, serving_unit: 'plate' },
    'Spaghetti Carbonara': { calories: 420, protein_g: 18, carbs_g: 50, fat_g: 16, serving_size: 1, serving_unit: 'plate' },
    'Spring Rolls': { calories: 130, protein_g: 4, carbs_g: 18, fat_g: 5, serving_size: 2, serving_unit: 'rolls' },
    'Steak': { calories: 350, protein_g: 42, carbs_g: 0, fat_g: 18, serving_size: 200, serving_unit: 'g' },
    'Strawberry Shortcake': { calories: 368, protein_g: 4, carbs_g: 48, fat_g: 18, serving_size: 1, serving_unit: 'serving' },
    'Sushi': { calories: 200, protein_g: 9, carbs_g: 30, fat_g: 5, serving_size: 6, serving_unit: 'pieces' },
    'Tacos': { calories: 210, protein_g: 10, carbs_g: 18, fat_g: 11, serving_size: 2, serving_unit: 'tacos' },
    'Takoyaki': { calories: 180, protein_g: 6, carbs_g: 22, fat_g: 8, serving_size: 4, serving_unit: 'balls' },
    'Tiramisu': { calories: 370, protein_g: 6, carbs_g: 36, fat_g: 22, serving_size: 1, serving_unit: 'slice' },
    'Tuna Tartare': { calories: 150, protein_g: 22, carbs_g: 4, fat_g: 5, serving_size: 100, serving_unit: 'g' },
    'Waffles': { calories: 370, protein_g: 8, carbs_g: 48, fat_g: 16, serving_size: 2, serving_unit: 'waffles' },
};

// Default nutrition for foods not in the lookup table
const DEFAULT_NUTRITION: NutritionInfo = {
    calories: 200,
    protein_g: 8,
    carbs_g: 25,
    fat_g: 8,
    serving_size: 1,
    serving_unit: 'serving',
};

// ============================================================
// Fallback demo foods (used when API is not configured)
// ============================================================
const DEMO_FOODS: Record<string, FoodRecognitionResponse> = {
    pizza: {
        food_name: 'Pizza',
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
    salad: {
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
    burger: {
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
    sushi: {
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
    pasta: {
        food_name: 'Spaghetti Bolognese',
        confidence: 0.90,
        calories_per_serving: 370,
        serving_size: 1,
        serving_unit: 'plate',
        protein_g: 18,
        carbs_g: 52,
        fat_g: 10,
        alternatives: [
            { food_name: 'Spaghetti Carbonara', confidence: 0.82, calories_per_serving: 420 },
            { food_name: 'Ravioli', confidence: 0.74, calories_per_serving: 290 },
        ],
    },
};

// ============================================================
// Main API Functions
// ============================================================

/**
 * Recognize food from a base64-encoded image.
 *
 * Calls the Hugging Face Inference API with the fine-tuned ViT model.
 * Falls back to demo mode if the API is not configured or unreachable.
 */
export async function recognizeFood(base64Image: string): Promise<FoodRecognitionResponse> {
    // If API is not configured, use demo mode
    if (!isHFConfigured()) {
        console.log('🔄 HF API not configured, using demo mode');
        return getDemoResult();
    }

    try {
        // Convert base64 to binary for HF API
        const binaryStr = atob(base64Image);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }

        // Use direct fetch instead of HfInference SDK
        // (React Native doesn't support creating Blobs from ArrayBuffer)
        const apiUrl = HF_API_URL.startsWith('http')
            ? HF_API_URL
            : `https://api-inference.huggingface.co/models/${HF_API_URL}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_API_TOKEN}`,
                'Content-Type': 'application/octet-stream',
            },
            body: bytes,
        });

        if (!response.ok) {
            const errText = await response.text();
            if (errText.includes('loading') || errText.includes('Loading')) {
                throw new Error('Model is loading, please try again in a moment');
            }
            throw new Error(`HF API error ${response.status}: ${errText}`);
        }

        const results: HFClassificationResult[] = await response.json();

        // Map HF response to our FoodRecognitionResponse
        return mapHFResultToResponse(results);
    } catch (error) {
        console.warn('HF Inference failed, using demo mode:', error);
        // If error is about model loading, re-throw so the UI can show a message
        if (error instanceof Error && error.message.includes('loading')) {
            throw error;
        }
        return getDemoResult();
    }
}

/**
 * Map Hugging Face classification results to our app's response format
 */
function mapHFResultToResponse(results: HFClassificationResult[]): FoodRecognitionResponse {
    const topResult = results[0];
    const foodName = topResult.label;
    const nutrition = FOOD_NUTRITION[foodName] ?? DEFAULT_NUTRITION;

    // Map top 2-3 alternatives
    const alternatives = results.slice(1, 4).map((r) => {
        const altNutrition = FOOD_NUTRITION[r.label] ?? DEFAULT_NUTRITION;
        return {
            food_name: r.label,
            confidence: r.score,
            calories_per_serving: altNutrition.calories,
        };
    });

    return {
        food_name: foodName,
        confidence: topResult.score,
        calories_per_serving: nutrition.calories,
        serving_size: nutrition.serving_size,
        serving_unit: nutrition.serving_unit,
        protein_g: nutrition.protein_g,
        carbs_g: nutrition.carbs_g,
        fat_g: nutrition.fat_g,
        alternatives,
    };
}

/**
 * Get a random demo scan result for testing
 */
export function getDemoResult(): FoodRecognitionResponse {
    const keys = Object.keys(DEMO_FOODS);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    return DEMO_FOODS[randomKey];
}

/**
 * Compress and resize image for API transmission.
 * Converts a file URI to a base64-encoded string.
 */
export async function prepareImageForScan(uri: string): Promise<string> {
    try {
        const response = await fetch(uri);
        const blob = await response.blob();

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch {
        return '';
    }
}


