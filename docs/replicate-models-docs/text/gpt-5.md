## Basic model info

Model name: openai/gpt-5
Model description: OpenAI's new model excelling at coding, writing, and reasoning.


## Model inputs

- prompt (optional): The prompt to send to the model. Do not use if using messages. (string)
- system_prompt (optional): System prompt to set the assistant's behavior (string)
- messages (optional): A JSON string representing a list of messages. For example: [{"role": "user", "content": "Hello, how are you?"}]. If provided, prompt and system_prompt are ignored. (array)
- image_input (optional): List of images to send to the model (array)
- reasoning_effort (optional): Constrains effort on reasoning for GPT-5 models. Currently supported values are minimal, low, medium, and high. The minimal value gets answers back faster without extensive reasoning first. Reducing reasoning effort can result in faster responses and fewer tokens used on reasoning in a response. For higher reasoning efforts you may need to increase your max_completion_tokens to avoid empty responses (where all the tokens are used on reasoning). (string)
- verbosity (optional): Constrains the verbosity of the model's response. Lower values will result in more concise responses, while higher values will result in more verbose responses. Currently supported values are low, medium, and high. GPT-5 supports this parameter to help control whether answers are short and to the point or long and comprehensive. (string)
- max_completion_tokens (optional): Maximum number of completion tokens to generate. For higher reasoning efforts you may need to increase your max_completion_tokens to avoid empty responses (where all the tokens are used on reasoning). (integer)


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

### Example (https://replicate.com/p/h9vsacmzg9rmc0crgr89xen3dm)

#### Input

```json
{
  "prompt": "Are you AGI?",
  "image_input": [],
  "reasoning_effort": "medium",
  "max_completion_tokens": 4096
}
```

#### Output

```json
[
  "",
  "Short",
  " answer",
  ":",
  " No",
  ".\n\n",
  "I",
  "\u2019m",
  " a",
  " large",
  " language",
  " model",
  " (",
  "Chat",
  "GPT",
  ")",
  " \u2014",
  " powerful",
  " at",
  " generating",
  " and",
  " reasoning",
  " over",
  " text",
  " across",
  " many",
  " domains",
  ",",
  " but",
  " not",
  " an",
  " autonomous",
  " general",
  " intelligence",
  ".\n\n",
  "Key",
  " limits",
  ":\n",
  "-",
  " No",
  " consciousness",
  ",",
  " self",
  "-awareness",
  ",",
  " or",
  " feelings",
  ".\n",
  "-",
  " No",
  " self",
  "-directed",
  " goals",
  " or",
  " agency",
  ";",
  " I",
  " act",
  " only",
  " on",
  " user",
  " prompts",
  ".\n",
  "-",
  " No",
  " persistent",
  " memory",
  " across",
  " sessions",
  ";",
  " I",
  " don",
  "\u2019t",
  " learn",
  " on",
  " my",
  " own",
  " after",
  " training",
  ".\n",
  "-",
  " Knowledge",
  " is",
  " static",
  " up",
  " to",
  " October",
  " ",
  "202",
  "4",
  " and",
  " can",
  " be",
  " incomplete",
  " or",
  " wrong",
  ".\n",
  "-",
  " I",
  " can",
  "\u2019t",
  " perceive",
  " or",
  " act",
  " in",
  " the",
  " physical",
  " world",
  ".\n\n",
  "If",
  " you",
  " tell",
  " me",
  " what",
  " you",
  "\u2019re",
  " trying",
  " to",
  " do",
  ",",
  " I",
  " can",
  " say",
  " whether",
  " I",
  "\u2019m",
  " a",
  " good",
  " fit",
  " and",
  " help",
  " accordingly",
  ".",
  "",
  ""
]
```


### Example (https://replicate.com/p/gcm040g0s5rm80crktgrjvz3b0)

#### Input

```json
{
  "prompt": "Are you AGI?",
  "messages": [],
  "verbosity": "medium",
  "image_input": [],
  "reasoning_effort": "minimal"
}
```

#### Output

```json
[
  "",
  "No",
  ".",
  " I",
  "\u2019m",
  " a",
  " narrow",
  " AI",
  " language",
  " model",
  ".",
  " I",
  " can",
  " generate",
  " and",
  " reason",
  " about",
  " text",
  " across",
  " many",
  " topics",
  ",",
  " but",
  " I",
  " don",
  "\u2019t",
  " have",
  " general",
  " human",
  "-level",
  " intelligence",
  ",",
  " self",
  "-awareness",
  ",",
  " or",
  " open",
  "-ended",
  " autonomy",
  ".",
  " My",
  " abilities",
  " are",
  " bounded",
  " by",
  " my",
  " training",
  " data",
  ",",
  " design",
  ",",
  " and",
  " the",
  " information",
  " you",
  " provide",
  " in",
  " a",
  " conversation",
  "."
]
```


## Model readme

> GPT-5 is OpenAI's capable model to date, designed for advanced reasoning, code generation, instruction following, and tool use. This guide covers key features and how to get the most from the GPT-5 family.
> 
> **🧠 Model Variants**
> 
> gpt-5: Best for complex, multi-step tasks and rich world knowledge.
> 
> gpt-5-mini: Balanced speed and cost, ideal for chat and medium-difficulty reasoning.
> 
> gpt-5-nano: Lightweight, great for fast, simple tasks like classification.
> 
> **🔧 Key Features**
> 
> Reasoning Effort
> Control how deeply the model thinks before responding.
> 
> minimal: Fastest; good for coding and clear instructions.
> 
> medium (default): Balanced.
> 
> high: Most thorough.
> 
> Prompt tip: For minimal, ask the model to "think step-by-step" to improve quality.
> 
> **Verbosity**
> 
> Control how much the model says.
> 
> low: Concise answers/code (e.g., SQL queries).
> 
> medium: Default.
> 
> high: Detailed explanations or refactoring.
> 
> **Custom Tools**
> 
> Define tools with freeform text input (code, SQL, etc.). Use grammars (CFGs) to constrain output to specific formats. Always validate inputs/outputs.
> 
> **Allowed Tools**
> 
> Control which tools the model can or must use via allowed_tools. Helps with safety, predictability, and caching.
> 
> **Preambles**
> 
> Ask the model to explain tool usage decisions before invoking them. Improves transparency and debugging.
> 
> **🔄 Migration Tips**
> 
> From older models: Use gpt-5 for o3 and gpt-4.1 tasks. Start with medium or minimal reasoning depending on complexity.
> 
> From Chat Completions: Switch to the Responses API to support reasoning carryover (CoT). This improves latency and cache hits.
> 
> **💻 Best Practices**
> 
> Coding
> Define the model’s role clearly.
> 
> Require testing/validation for generated code.
> 
> Use examples for tool usage.
> 
> Guide formatting with Markdown standards.
> 
> **Frontend Development**
> 
> Supports Tailwind, shadcn/ui, Radix Themes, Lucide icons, Motion.
> 
> Use detailed prompts for better UI/UX, structure, and integration.
> 
> **Agentic Tasks**
> 
> Ask GPT-5 to break down tasks and persist until fully resolved.
> 
> Use preambles and TODO tools to improve planning and completeness.
> 
> **🧩 Reasoning Tokens**
> 
> GPT-5 retains and reuses reasoning across turns for improved performance. With ZDR or store=false, encrypted reasoning is supported for secure reuse.

