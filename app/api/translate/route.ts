import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, translate_summary = false, movie_id = '' } = body;
    
    if (!text) {
      return NextResponse.json(
        { status: 'error', message: 'Missing text to translate' },
        { status: 400 }
      );
    }
    
    // Get translation configuration from environment variables
    const api_url = process.env.TRANSLATION_API_URL || 'https://api.siliconflow.cn/v1/chat/completions';
    const api_token = process.env.TRANSLATION_API_TOKEN || '';
    const model = process.env.TRANSLATION_MODEL || 'THUDM/glm-4-9b-chat';
    const source_lang = process.env.TRANSLATION_SOURCE_LANG || '日语';
    const target_lang = process.env.TRANSLATION_TARGET_LANG || '中文';
    
    // Check if API URL is set
    if (!api_url) {
      return NextResponse.json(
        { status: 'error', message: 'Translation API URL is not set' },
        { status: 400 }
      );
    }
    
    // Check if API token is set (not needed for local Ollama)
    const is_ollama = api_url.includes('localhost:11434') || api_url.includes('192.168.1.133:11434');
    if (!api_token && !is_ollama) {
      return NextResponse.json(
        { status: 'error', message: 'Translation API token is not set' },
        { status: 400 }
      );
    }
    
    // Prepare request headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (api_token) {
      headers['Authorization'] = `Bearer ${api_token}`;
    }
    
    // Prepare request data
    const prompt = `Translate the following ${source_lang} text to ${target_lang}. Only return the translated text, no explanations:\n\n${text}`;
    
    // Build request payload based on API type
    let payload = {};
    
    if (is_ollama) {
      if (api_url.includes('/api/chat')) {
        // Chat interface format
        payload = {
          model: model,
          messages: [
            { role: 'system', content: `你是一个专业的${source_lang}到${target_lang}翻译器。` },
            { role: 'user', content: prompt }
          ],
          stream: false,
          options: {
            temperature: 0.3,
            top_p: 0.9
          }
        };
      } else {
        // Generate interface format
        payload = {
          model: model,
          prompt: `你是一个专业的${source_lang}到${target_lang}翻译器。\n${prompt}`,
          stream: false,
          options: {
            temperature: 0.3,
            top_p: 0.9
          }
        };
      }
    } else {
      // Standard OpenAI-compatible format
      payload = {
        model: model,
        messages: [
          { role: 'system', content: `You are a professional ${source_lang} to ${target_lang} translator.` },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3
      };
    }
    
    // Send request
    const response = await axios.post(
      api_url,
      payload,
      { headers, timeout: 60000 }
    );
    
    // Parse response
    if (response.status === 200) {
      const result = response.data;
      let translated_text = '';
      
      // Extract translated text from different response formats
      if (is_ollama) {
        if ('response' in result) {
          translated_text = result.response.trim();
        } else if ('message' in result && typeof result.message === 'object') {
          if ('content' in result.message && result.message.content) {
            translated_text = result.message.content.trim();
          }
        }
      } else if ('choices' in result && result.choices.length > 0) {
        const choice = result.choices[0];
        if ('message' in choice && 'content' in choice.message) {
          translated_text = choice.message.content.trim();
        } else if ('text' in choice) {
          translated_text = choice.text.trim();
        }
      }
      
      if (translated_text) {
        return NextResponse.json({
          status: 'success',
          translated_text
        });
      } else {
        return NextResponse.json(
          { status: 'error', message: 'Could not extract translated text from API response' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { status: 'error', message: `Translation request failed: HTTP ${response.status}` },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Translation process error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { status: 'error', message: `Translation process error: ${errorMessage}` },
      { status: 500 }
    );
  }
} 