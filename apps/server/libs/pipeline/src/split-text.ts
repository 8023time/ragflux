/**
 * 按知识库的 chunkStrategy 切分。未知策略回退到 general。
 */
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

const STRATEGIES: Record<string, { chunkSize: number; chunkOverlap: number; separators: string[] }> = {
  general: { chunkSize: 800, chunkOverlap: 120, separators: ['\n\n', '\n', '。', '！', '？', '. ', ' ', ''] },
  book: { chunkSize: 1200, chunkOverlap: 150, separators: ['\n第', '\nChapter', '\n# ', '\n\n', '\n', '。', ''] },
  paper: {
    chunkSize: 1000,
    chunkOverlap: 100,
    separators: ['\n# ', '\n## ', '\nAbstract', '\nIntroduction', '\n\n', '\n', ''],
  },
  resume: { chunkSize: 500, chunkOverlap: 40, separators: ['\n\n', '\n', '；', ';', ''] },
  qa: { chunkSize: 600, chunkOverlap: 0, separators: ['\nQ:', '\n问：', '\n问:', '\n\n', '\n', ''] },
};

export async function splitText(strategy: string, text: string): Promise<string[]> {
  const options = STRATEGIES[strategy] ?? STRATEGIES.general;
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: options.chunkSize,
    chunkOverlap: options.chunkOverlap,
    separators: options.separators,
  });
  const parts = await splitter.splitText(text);
  return parts.map((part) => part.trim()).filter(Boolean);
}

export function estimateTokens(text: string): number {
  let tokens = 0;
  for (const char of text) {
    tokens += char.charCodeAt(0) > 255 ? 1 : 0.25;
  }
  return Math.max(1, Math.ceil(tokens));
}
