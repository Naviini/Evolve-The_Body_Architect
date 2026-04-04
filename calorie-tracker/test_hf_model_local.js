const { HfInference } = require('@huggingface/inference');

async function test() {
    const token = "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"; // The new token from .env
    const hf = new HfInference(token);

    try {
        const res = await fetch("https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80");
        const blob = await res.blob();

        console.log("Calling HF API with new token...");
        const result = await hf.imageClassification({
            data: blob,
            model: 'naviniekanayake4/food-vit-fine-tuned'
        });

        console.log("Success! Results:");
        console.log(JSON.stringify(result, null, 2));
    } catch (err) {
        console.error("Error from HF API:", err.message || err);
    }
}

test();
