import { PDFParse } from 'pdf-parse';
import { AppError } from '@/lib/utils/errors';

const MIN_TEXT_LENGTH = 50;

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });

  try {
    console.log('[PDF] Starting parse, buffer size:', buffer.length);
    const result = await parser.getText();
    console.log('[PDF] Parse complete, text length:', result.text.length);
    const text = result.text.trim();

    if (text.length < MIN_TEXT_LENGTH) {
      throw new AppError(
        422,
        'PDF appears empty or image-based (no extractable text). Upload a text-based PDF.'
      );
    }

    return text;
  } catch (error) {
    console.error('[PDF] Parse error:', error);
    if (error instanceof Error) {
      console.error('[PDF] Error message:', error.message);
      console.error('[PDF] Error stack:', error.stack);
    }
    if (error instanceof AppError) throw error;
    throw new AppError(
      422,
      `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  } finally {
    await parser.destroy();
  }
}
