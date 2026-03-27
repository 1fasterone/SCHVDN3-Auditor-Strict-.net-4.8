import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AuditResult {
  isValid: boolean;
  errors: {
    line?: number;
    message: string;
    suggestion: string;
  }[];
  improvedCode?: string;
}

export interface AIConfig {
  provider: 'gemini' | 'local';
  localUrl: string;
  modelName: string;
}

async function callLocalLLM(prompt: string, config: AIConfig, responseSchema?: any) {
  const response = await fetch(`${config.localUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.modelName,
      messages: [
        { role: 'system', content: 'You are an expert GTA V ScriptHookVDotNet3 (SHVDN3) developer and auditor. Return ONLY valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    throw new Error(`Local LLM Error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function auditScript(scriptContent: string, ruleset: any, aiConfig: AIConfig): Promise<AuditResult> {
  const prompt = `
      Audit the following C# script for compatibility with .NET 4.8 and SHVDN3 API.
      
      Current Ruleset Knowledge:
      ${JSON.stringify(ruleset, null, 2)}
      
      Script to Audit:
      \`\`\`csharp
      ${scriptContent}
      \`\`\`
      
      Return a JSON object with:
      - isValid: boolean
      - errors: array of { line: number, message: string, suggestion: string }
      - improvedCode: the script with fixes applied.
    `;

  if (aiConfig.provider === 'local') {
    const text = await callLocalLLM(prompt, aiConfig);
    return JSON.parse(text);
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isValid: { type: Type.BOOLEAN },
          errors: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                line: { type: Type.NUMBER },
                message: { type: Type.STRING },
                suggestion: { type: Type.STRING }
              },
              required: ["message", "suggestion"]
            }
          },
          improvedCode: { type: Type.STRING }
        },
        required: ["isValid", "errors"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function learnFromLog(logContent: string, currentRuleset: any, aiConfig: AIConfig): Promise<any> {
  const prompt = `
      Analyze this ScriptHookVDotNet3.log file and extract new rules or solutions for the auditor.
      
      Log Content:
      ${logContent}
      
      Current Ruleset:
      ${JSON.stringify(currentRuleset, null, 2)}
      
      Return a JSON array of objects representing the NEW rules to add.
      Each rule should have: id, errorPattern, description, solution, category.
      Do not duplicate existing rules. Focus on .NET 4.8 and SHVDN3 specific issues.
    `;

  if (aiConfig.provider === 'local') {
    const text = await callLocalLLM(prompt, aiConfig);
    const newRules = JSON.parse(text);
    return [...currentRuleset, ...(Array.isArray(newRules) ? newRules : [newRules])];
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            errorPattern: { type: Type.STRING },
            description: { type: Type.STRING },
            solution: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["id", "errorPattern", "description", "solution", "category"]
        }
      }
    }
  });

  const newRules = JSON.parse(response.text);
  return [...currentRuleset, ...newRules];
}
