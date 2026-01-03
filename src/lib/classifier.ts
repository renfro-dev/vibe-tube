import { GoogleGenerativeAI } from '@google/generative-ai';

export type VibeCategory = 'Vibe Coding' | 'Model Upgrades' | 'Robots' | 'Hype' | 'Random' | 'Human in the Loop' | 'Sustainability' | 'Security' | 'AI Fail';

export interface ClassificationResult {
    category: VibeCategory;
    reason: string;
}

// Keywords with weights
const CODING_KEYWORDS = [
    'cursor', 'bolt', 'replit', 'vscode', 'coding', 'engineer', 'software',
    'devin', 'stackblitz', 'copilot', 'programming', 'ide', 'git',
    'mcp', 'context protocol', 'server', 'typescript', 'python', 'shadcn',
    'nextjs', 'react', 'api', 'sdk', 'database', 'evals', 'observability',
    'infra', 'deployment', 'testing', 'debug'
];

const MODEL_KEYWORDS = [
    'gpt-4', 'claude', 'gemini', 'llama', 'deepseek', 'mistral', 'grok',
    'openai', 'anthropic', 'google', 'meta', 'benchmark', 'sota', 'multimodal',
    'reasoning', 'flash', 'pro', 'ultra', '3.5', 'o1', 'v4', 'llm'
];

const ROBOT_KEYWORDS = [
    'humanoid', 'tesla bot', 'optimus', 'figure', 'boston dynamics',
    'robot', 'robotics', 'servo', 'actuator', '1x', 'neo', 'atlas',
    'unitree', 'cyberdog', 'spot', 'digit', 'agility'
];

const HYPE_KEYWORDS = [
    'agi', 'singularity', 'doom', 'revolution', 'trillion', 'game over',
    'end of', 'insane', 'mind blowing', 'scary', 'dangerous', 'warning',
    'urgent', 'huge news', 'breakthrough', 'changed everything'
];

const SUSTAINABILITY_KEYWORDS = [
    'climate', 'energy', 'carbon', 'power', 'green', 'nuclear', 'fusion',
    'environment', 'solar', 'sustainable', 'grid', 'battery', 'emissions'
];

const SECURITY_KEYWORDS = [
    'security', 'hack', 'exploit', 'vulnerability', 'injection', 'jailbreak',
    'red team', 'privacy', 'safety', 'cyber', 'auth', 'penetration', 'attack'
];

const FAIL_KEYWORDS = [
    'hallucination', 'wrong answer', 'fail', 'error', 'confused', 'nonsense',
    'glitch', 'stupid ai', 'broken', 'mess up', 'failure', 'lying'
];

const MUSIC_EXCLUSIONS = [
    'official video', 'lyrics', 'music video', 'ft.', 'feat.', 'concert',
    'live performance', 'album', 'song', 'remix', 'fall out boy', 'vevo',
    'records', 'mv', 'soundtrack'
];

function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function calculateScore(text: string, keywords: string[]): number {
    let score = 0;

    keywords.forEach(word => {
        // strict word boundary matching
        const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
        if (regex.test(text)) {
            score += 1;
        }
    });

    return score;
}

export async function classifyVideoAgent(
    title: string,
    description: string = '',
    tags: string[] = [],
    transcript: string | null = null
): Promise<ClassificationResult> {
    const text = `${title} ${description} ${tags.join(' ')}`.toLowerCase();

    // 1. HARD BLOCKS (Music, etc) - Check metadata first (cheap)
    for (const block of MUSIC_EXCLUSIONS) {
        if (text.includes(block)) {
            return {
                category: 'Random',
                reason: `Blocked term: "${block}" detected.`
            };
        }
    }

    // 2. LLM STRATEGY (Gemini)
    const apiKey = process.env.GOOGLE_API_KEY;
    if (apiKey) {
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

            const transcriptSnippet = transcript ? transcript.slice(0, 15000) : "No transcript available."; // Limit for token efficiency if needed, though Flash is huge.

            const prompt = `
        You are a strict video curator for an AI Engineering Newsletter. 
        Analyze the following video metadata AND transcript to classify it into EXACTLY ONE category.
        Provide a short reason for your decision.

        Categories:
        1. "Vibe Coding": Software engineering, coding tools, IDEs (Cursor, Replit), MCP, Evals, CI/CD, Observability, Infra.
        2. "Model Upgrades": New LLM releases, benchmarks, GPT-4, Claude, Gemini, model architecture decisions.
        3. "Robots": Physical humanoid robots, hardware robotics, Tesla Optimus.
        4. "Hype": AGI predictions, doomerism, singularity talk, "changed everything" type sentiment.
        5. "Sustainability": Energy, Nuclear Fusion, Climate Tech, Power Grids, Green AI.
        6. "Security": AI Safety, Jailbreaks, Prompt Injection, Hacking, Cyber Security.
        7. "AI Fail": AI Hallucinations, logic errors, funny failures. STRICTLY EXCLUDE Physical/Robot failures.
        8. "Human in the Loop": Tech/AI related, but vague or doesn't fit clearly into above categories. (Use this for uncertainty).
        9. "Random": STRICTLY for Non-AI content. Music, Politics, Funny videos, Animals, General Tech news not specifically about AI engineering.

        Critical Rules:
        - If I don't know, or it's vague: Choose "Random".
        - "Dog saves child" -> Random. (NOT Model Upgrades).
        - "Interview with Sam Altman" -> Random (unless he announces a specific Model).
        - "Evals and Observability" -> Vibe Coding.
        - "MCP Demos" -> Vibe Coding.
        - "Fall Out Boy" -> Random.
        - "Robot falling down" -> Robots (NOT AI Fail).
        - "ChatGPT can't do math" -> AI Fail.
        - If unsure between Tech categories -> Human in the Loop.

        Output JSON format only:
        {
          "category": "Category Name",
          "reason": "Max 10 words explanation."
        }

        Video Title: ${title}
        Video Description: ${description.slice(0, 300)}...
        Tags: ${tags.join(', ')}
        Transcript Start: ${transcriptSnippet}...
      `;

            const result = await model.generateContent(prompt);
            const outputText = result.response.text().trim();

            // Basic JSON cleanup
            const jsonStr = outputText.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(jsonStr);

            const validCategories = ['Vibe Coding', 'Model Upgrades', 'Robots', 'Hype', 'Random', 'Human in the Loop', 'Sustainability', 'Security', 'AI Fail'];
            if (validCategories.includes(parsed.category)) {
                return {
                    category: parsed.category,
                    reason: parsed.reason || "AI Classification"
                };
            }
        } catch (error) {
            console.error("Gemini Classification failed, falling back to heuristic:", error);
        }
    }

    // 3. HEURISTIC STRATEGY (Fallback)
    console.log(`[Classifier] Using Heuristic for: "${title.slice(0, 30)}..."`);

    const scores = {
        'Vibe Coding': calculateScore(text, CODING_KEYWORDS),
        'Model Upgrades': calculateScore(text, MODEL_KEYWORDS),
        'Robots': calculateScore(text, ROBOT_KEYWORDS),
        'Hype': calculateScore(text, HYPE_KEYWORDS),
        'Sustainability': calculateScore(text, SUSTAINABILITY_KEYWORDS),
        'Security': calculateScore(text, SECURITY_KEYWORDS),
        'AI Fail': calculateScore(text, FAIL_KEYWORDS),
    };

    let bestCategory: VibeCategory = 'Random';
    let maxScore = 0;

    (Object.entries(scores) as [VibeCategory, number][]).forEach(([cat, score]) => {
        if (score > maxScore) {
            maxScore = score;
            bestCategory = cat as VibeCategory;
        }
    });

    if (maxScore < 1) {
        return { category: 'Random', reason: 'No specific keywords matched.' };
    }

    return {
        category: bestCategory,
        reason: `Matched keywords for ${bestCategory} (Score: ${maxScore})`
    };
}
