import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// 获取API基础URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.246:8922/api';

/**
 * 通用API代理
 * 这个路由会将所有请求转发到实际的API服务器，并将响应返回给客户端
 * 这样可以解决CORS问题，因为请求现在来自同一个域
 */
export async function GET(
  request: NextRequest,
) {
  try {
    // 获取URL中的查询参数
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    
    // 移除path参数，保留其他参数
    const params = Object.fromEntries(searchParams.entries());
    delete params.path;
    
    console.log(`[API Proxy] 转发GET请求: ${path}, 参数:`, params);
    
    // 构建实际的API URL
    const apiUrl = `${API_BASE_URL}/${path}`;
    
    // 转发请求到实际的API
    const response = await axios.get(apiUrl, { params });
    
    // 返回API的响应
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('[API Proxy] 请求失败:', error);
    
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: `API请求失败: ${error.message}`,
          response: error.response?.data
        },
        { status: error.response?.status || 500 }
      );
    }
    
    return NextResponse.json(
      { 
        status: 'error', 
        message: `API请求失败: ${error instanceof Error ? error.message : '未知错误'}`
      },
      { status: 500 }
    );
  }
}

// 支持POST请求
export async function POST(
  request: NextRequest,
) {
  try {
    // 获取URL中的查询参数
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    
    // 获取请求体
    const body = await request.json().catch(() => ({}));
    
    console.log(`[API Proxy] 转发POST请求: ${path}, 数据:`, body);
    
    // 构建实际的API URL
    const apiUrl = `${API_BASE_URL}/${path}`;
    
    // 转发请求到实际的API
    const response = await axios.post(apiUrl, body);
    
    // 返回API的响应
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('[API Proxy] POST请求失败:', error);
    
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: `API请求失败: ${error.message}`,
          response: error.response?.data
        },
        { status: error.response?.status || 500 }
      );
    }
    
    return NextResponse.json(
      { 
        status: 'error', 
        message: `API请求失败: ${error instanceof Error ? error.message : '未知错误'}`
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range'
    }
  });
} 