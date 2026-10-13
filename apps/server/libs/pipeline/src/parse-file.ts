/**
 * 按扩展名把原文变成文本块或图片块。
 * 复杂 PDF 的版面解析不在本阶段，PDF 只抽文字。
 */
import ExcelJS from 'exceljs';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { fileExtension, imageMimeType, isImageExtension } from './file-kind.js';

export type ParsedBlock = {
  text: string;
  pageNumber: number;
  elementType: 'text' | 'image';
  mimeType: string;
};

const MAX_BLOCKS = 2000;

export async function parseFile(name: string, data: Buffer): Promise<ParsedBlock[]> {
  const extension = fileExtension(name);
  if (isImageExtension(extension)) {
    return [{ text: '', pageNumber: 1, elementType: 'image', mimeType: imageMimeType(extension) }];
  }
  if (extension === 'pdf') {
    return limitBlocks(await parsePdf(data));
  }
  if (extension === 'docx') {
    const result = await mammoth.extractRawText({ buffer: data });
    return limitBlocks([{ text: result.value, pageNumber: 0, elementType: 'text', mimeType: '' }]);
  }
  if (extension === 'xlsx') {
    return limitBlocks(await parseXlsx(data));
  }
  if (extension === 'txt' || extension === 'csv' || extension === 'md' || extension === 'markdown') {
    return limitBlocks([{ text: decodeText(data), pageNumber: 0, elementType: 'text', mimeType: '' }]);
  }
  throw new Error('不支持的文件类型');
}

async function parsePdf(data: Buffer): Promise<ParsedBlock[]> {
  const parser = new PDFParse({ data: new Uint8Array(data) });
  try {
    const result = await parser.getText();
    return result.pages.map((page) => ({
      text: page.text,
      pageNumber: page.num,
      elementType: 'text' as const,
      mimeType: '',
    }));
  } finally {
    await parser.destroy();
  }
}

async function parseXlsx(data: Buffer): Promise<ParsedBlock[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const blocks: ParsedBlock[] = [];
  workbook.eachSheet((sheet, index) => {
    const lines = [`# ${sheet.name}`];
    sheet.eachRow((row) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      const line = values
        .map((cell) => cellToString(cell))
        .join('\t')
        .trim();
      if (line) {
        lines.push(line);
      }
    });
    blocks.push({ text: lines.join('\n'), pageNumber: index, elementType: 'text', mimeType: '' });
  });
  return blocks;
}

function cellToString(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    const record = value as { text?: string; result?: unknown; richText?: { text?: string }[] };
    if (typeof record.text === 'string') {
      return record.text;
    }
    if (Array.isArray(record.richText)) {
      return record.richText.map((part) => part.text ?? '').join('');
    }
    if ('result' in record) {
      return cellToString(record.result);
    }
  }
  return '';
}

function decodeText(data: Buffer): string {
  const text = data.toString('utf8');
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function limitBlocks(blocks: ParsedBlock[]): ParsedBlock[] {
  if (blocks.length > MAX_BLOCKS) {
    throw new Error('解析结果过多');
  }
  return blocks;
}
