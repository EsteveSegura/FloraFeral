## Basic model info

Model name: google/gemini-2.5-flash
Model description: Google’s hybrid “thinking” AI model optimized for speed and cost-efficiency


## Model inputs

- prompt (required): The text prompt to send to the model (string)
- images (optional): Input images to send with the prompt (max 10 images, each up to 7MB) (array)
- videos (optional): Input videos to send with the prompt (max 10 videos, each up to 45 minutes) (array)
- system_instruction (optional): System instruction to guide the model's behavior (string)
- temperature (optional): Sampling temperature between 0 and 2 (number)
- top_p (optional): Nucleus sampling parameter - the model considers the results of the tokens with top_p probability mass (number)
- max_output_tokens (optional): Maximum number of tokens to generate (integer)
- thinking_budget (optional): Thinking budget for reasoning (0 to disable thinking, higher values allow more reasoning) (integer)
- dynamic_thinking (optional): Enable dynamic thinking - the model will adjust the thinking budget based on the complexity of the request (overrides thinking_budget parameter) (boolean)


## Model output schema

{
  "type": "array",
  "items": {
    "type": "string"
  },
  "title": "Output",
  "x-cog-array-type": "iterator",
  "x-cog-array-display": "concatenate"
}

If the input or output schema includes a format of URI, it is referring to a file.


## Example inputs and outputs

Use these example outputs to better understand the types of inputs the model accepts, and the types of outputs the model returns:

### Example (https://replicate.com/p/75rmdjrcchrm80csnhdacrc7jr)

#### Input

```json
{
  "top_p": 0.95,
  "prompt": "A recipe for flan",
  "temperature": 1,
  "dynamic_thinking": false,
  "max_output_tokens": 65535
}
```

#### Output

```json
[
  "Flan is a classic, creamy, and wonderfully simple dessert with a rich caramel topping. This recipe focuses on a traditional Latin American style, which is often a bit denser and creamier than some other variations.\n\n**Classic Caramel Flan**\n\nThis",
  " recipe makes one 8 or 9-inch round flan, serving 6-8 people.\n\n**Yields:** 1 flan (8-9 inches)\n**Prep time:** 20 minutes\n**Cook time:** ",
  "50-70 minutes\n**Chill time:** At least 4 hours (preferably overnight)\n\n---\n\n**Ingredients:**\n\n**For the Caramel:**\n*   1 cup (200g) granulated sugar\n*   ",
  "1/4 cup (60ml) water\n\n**For the Custard:**\n*   1 (14-ounce/397g) can sweetened condensed milk\n*   1 (12-ounce/35",
  "4ml) can evaporated milk\n*   1 cup (240ml) whole milk (or half-and-half for extra richness)\n*   4 large eggs\n*   2 large egg yolks (for extra richness and",
  " a smoother texture)\n*   2 teaspoons vanilla extract\n*   1/4 teaspoon salt\n\n---\n\n**Equipment:**\n*   8 or 9-inch round cake pan (or a 6-cup bundt pan,",
  " or a loaf pan)\n*   Larger roasting pan (to create a water bath)\n*   Heavy-bottomed saucepan\n*   Whisk\n*   Fine-mesh sieve\n\n---\n\n**Instructions:**\n\n**1",
  ". Preheat Oven & Prepare Water Bath:**\n    *   Preheat your oven to **350\u00b0F (175\u00b0C)**.\n    *   Place a large roasting pan on the middle rack of your oven. This is",
  " where your flan pan will sit to bake in a water bath.\n\n**2. Make the Caramel:**\n    *   In a heavy-bottomed saucepan, combine the granulated sugar and water.\n    *   Cook over medium-high",
  " heat, stirring until the sugar dissolves.\n    *   Once it starts to boil, **do not stir**. You can gently swirl the pan occasionally if needed to ensure even cooking.\n    *   Continue cooking until the sugar turns a deep amber or",
  " light brown color. This usually takes about 5-8 minutes. Watch carefully, as it can burn quickly once it reaches the desired color.\n    *   Immediately and carefully pour the hot caramel into your 8 or 9-inch cake pan",
  ".\n    *   Carefully tilt the pan to coat the bottom evenly with the caramel. Set aside to cool; the caramel will harden.\n\n**3. Prepare the Custard:**\n    *   In a large bowl, whisk together the",
  " sweetened condensed milk, evaporated milk, whole milk (or half-and-half), eggs, egg yolks, vanilla extract, and salt until just combined.\n    *   **Important for Smoothness:** Strain the custard mixture through a fine",
  "-mesh sieve into another bowl or a large measuring cup with a spout. This removes any bits of cooked egg or chalazae, ensuring a perfectly smooth flan. Discard any solids left in the sieve.\n\n**4. Assemble and Bake:**",
  "\n    *   Carefully pour the strained custard mixture over the hardened caramel in the prepared cake pan.\n    *   Place the flan pan *inside* the larger roasting pan that's already in the oven.\n    *   ",
  "Carefully pour hot tap water into the roasting pan until it comes about halfway up the sides of the flan pan. (Be careful not to splash water into the flan!)\n    *   Bake for 50-7",
  "0 minutes, or until the edges are set but the center still jiggles slightly when gently shaken. A knife inserted near the edge should come out clean.\n    *   **Do not overbake**, or the flan can become rubber",
  "y or develop cracks.\n\n**5. Cool and Chill:**\n    *   Carefully remove the flan pan from the water bath (leave the roasting pan in the oven if you want, or remove it as well).\n    ",
  "*   Let the flan cool completely on a wire rack at room temperature.\n    *   Once cooled, cover the flan pan with plastic wrap and refrigerate for at least 4 hours, but preferably **overnight**. Ch",
  "illing is crucial for the flan to set properly and for the caramel to liquify into a sauce.\n\n**6. Unmold and Serve:**\n    *   When ready to serve, run a thin knife around the outer edge of the fl",
  "an to loosen it.\n    *   Place a large serving plate (with a slight rim to catch the caramel sauce) upside down over the flan pan.\n    *   Holding the plate and pan firmly together, quickly and confidently flip them over",
  ".\n    *   Gently lift the flan pan. The flan should slide out, and the beautiful caramel sauce will cascade over it. If it doesn't release immediately, give the bottom of the pan a gentle tap.\n",
  "    *   Serve chilled and enjoy!\n\n---\n\n**Tips for Success:**\n\n*   **Don't Stir the Caramel:** Once the sugar and water mixture boils, resist the urge to stir. Stirring can cause sugar crystals to form.",
  " Swirl the pan instead.\n*   **Watch the Caramel Closely:** Caramel goes from perfect to burnt very quickly. Have your cake pan ready to pour it in immediately.\n*   **Water Bath is Key:** The water bath (",
  "Bain-Marie) ensures even, gentle cooking, preventing the custard from curdling and keeping it wonderfully smooth and creamy.\n*   **Don't Overbake:** A slight jiggle in the center is good. Overbaking will result",
  " in a tougher, less creamy flan.\n*   **Chill Thoroughly:** This is critical! A well-chilled flan has the best texture and allows the caramel to turn into a luscious sauce.\n*   **Strain the Cust",
  "ard:** This step takes an extra minute but makes a huge difference in achieving that perfectly silky smooth texture.\n\nEnjoy your delicious homemade flan!"
]
```


### Example (https://replicate.com/p/94p6hekpwnrme0ctc1kb2c6j18)

#### Input

```json
{
  "top_p": 0.95,
  "images": [
    "https://replicate.delivery/pbxt/O1TXLIqsDC7pdOzMl259hqrdwkDLjxrf8Fsg2ZwYVIIkoHkm/replicate-prediction-vygd5qqab1rmc0ctb9cbr14cxw.jpg"
  ],
  "prompt": "describe this image in detail",
  "videos": [],
  "temperature": 1,
  "dynamic_thinking": false,
  "max_output_tokens": 65535
}
```

#### Output

```json
[
  "This stunning image depicts a solitary samurai warrior in a moment of deep contemplation amidst a breathtaking autumn mountain landscape, rendered in a style reminiscent of classical painting with a touch of modern digital artistry.\n\nIn the foreground, slightly to the left of center",
  ", a samurai is seated on a rugged, dark gray and brown rocky outcrop. He is in a contemplative or meditative posture, with his head bowed and gaze directed downwards. His hands are clasped or resting gently in his lap.\n\nThe",
  " samurai's armor is remarkably ornate and colorful. He wears a regal purple kabuto (helmet) with golden, horn-like kuwagata crests on the front, adorned with intricate golden details. His face is obscured by a dark blue",
  " or black mask (mempo), with subtle red accents around what appears to be the mouth or chin guard. The body armor consists of white or cream-colored sections with delicate, intricate purple patterns, possibly depicting floral motifs, clouds, or traditional",
  " Japanese designs. These patterned sections are interspersed with solid purple plates, all appearing to be meticulously lacquered and held together with visible lacing. A katana, sheathed in a dark scabbard, rests at his left hip.\n\nDomin",
  "ating the left and upper-middle sections of the image is a gnarled, ancient tree branch, its dark, textured bark contrasting with its vibrant foliage. The leaves are a magnificent tapestry of autumn colors: fiery reds, rich oranges, and",
  " brilliant yellows, suggesting a maple or similar deciduous tree. The individual leaves are highly detailed, showing veins and variations in color, and are clustered densely on the branches, some smaller twigs extending with nascent buds or berries.\n\nThe background unfolds into a majestic",
  " mountain range. Several layers of peaks fade into the distance, rendered with atmospheric perspective, appearing progressively lighter blue and hazier. The most prominent feature in the background is a towering, sharp, snow-capped mountain peak on the far right, its",
  " pristine white snow standing out against the pale, almost white or light blue sky.\n\nThe overall color palette is a striking blend of vibrant autumn hues (reds, oranges, yellows) in the foliage, deep purples, whites, and dark",
  " blues of the samurai's armor, and the cool blues, grays, and whites of the distant mountains and sky. The lighting is soft and diffused, creating a serene and introspective mood. The image evokes a sense of peace, resilience",
  ", and the beauty of nature, with the samurai serving as a stoic, reflective presence within the grand landscape."
]
```


### Example (https://replicate.com/p/8tkt960eahrme0ctc1kvw647g0)

#### Input

```json
{
  "top_p": 0.95,
  "images": [],
  "prompt": "describe this video",
  "videos": [
    "https://replicate.delivery/pbxt/O1TZsCqHFJPtCUxXmh6Qi4ptnGieu7UWpV5WKwlhYw9unnp6/replicate-prediction-fe1vrjn4pxrmc0ct9yprq3cf6w.mp4"
  ],
  "temperature": 1,
  "dynamic_thinking": false,
  "max_output_tokens": 65535
}
```

#### Output

```json
[
  "This video features a mesmerizing close-up of a soap bubble freezing in slow motion.\n\nInitially, a perfectly spherical, iridescent soap bubble floats centered in the frame, reflecting various rainbow colors \u2013 purples, blues, greens, and pinks \u2013 on its",
  " surface. The background is dark and blurred, suggesting a cool or cold environment.\n\nAround the 0:02 mark, delicate, crystalline patterns begin to appear at the very bottom edge of the bubble. These patterns rapidly expand upwards and outwards across",
  " the bubble's surface. They are intricate and resemble tiny snowflakes or fern fronds forming.\n\nAs the freezing progresses, the original shimmering iridescence of the bubble is gradually replaced by a frosty, opaque white texture. The ice crystals connect",
  " and spread, creating a beautiful, detailed mosaic across the entire sphere.\n\nBy the end of the video, the bubble is completely frozen solid, transformed into a stunning, uniform white frosted orb, resembling a delicate miniature ice sculpture covered in intricate natural",
  " patterns."
]
```


## Model readme

> # Gemini 2.5 Flash
> 
> Gemini 2.5 Flash is Google DeepMind’s cost-efficient, high-speed multimodal model designed for production workloads.  
> It balances speed, reasoning, and controllable "thinking depth," making it ideal for developers who need performance at scale.
> 
> ---
> 
> ## Key Features
> 
> - **Multimodal Input**: Supports text, images, audio, and video as inputs.  
> - **Long Context Handling**: Works with extremely long inputs (up to ~1 million tokens).  
> - **Controllable Reasoning**: Developers can choose how much internal reasoning ("thinking") the model applies.  
> - **Optimized for Speed & Cost**: Fast inference times with efficient compute usage.  
> - **Flexible Output**: Generates text, captions, summaries, structured data, and more.

