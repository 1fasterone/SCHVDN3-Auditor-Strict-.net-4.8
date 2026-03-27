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

export async function auditScript(scriptContent: string, ruleset: any): Promise<AuditResult> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `
      You are an expert GTA V ScriptHookVDotNet3 (SHVDN3) developer and auditor.
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
    `,
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

  try {
    return JSON.parse(response.text);
  } catch (e) {
    return {
      isValid: false,
      errors: [{ message: "Failed to parse audit results", suggestion: "Try again" }]
    };
  }
}

export async function learnFromLog(logContent: string, currentRuleset: any): Promise<any> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `
      Analyze this ScriptHookVDotNet3.log file and extract new rules or solutions for the auditor.
      
      Log Content:
      ${logContent}
      
      Current Ruleset:
      ${JSON.stringify(currentRuleset, null, 2)}
      
      Return a JSON object representing the UPDATED ruleset (the entire rules array).
      Each rule should have: id, errorPattern, description, solution, category.
      Do not duplicate existing rules. Focus on .NET 4.8 and SHVDN3 specific issues.
    `,
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

  try {
    return JSON.parse(response.text);
  } catch (e) {
    return currentRuleset;
  }
}
