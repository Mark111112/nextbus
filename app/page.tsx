'use client';

import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import Layout from '../components/Layout';
import { getMovieData, testApiConnection } from '../lib/api';
import { Movie } from '../lib/types';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  const [recentMovies, setRecentMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiTestResult, setApiTestResult] = useState<string>('');
  const [apiTestStatus, setApiTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // 测试API连接
  const handleTestApiConnection = async () => {
    setApiTestStatus('loading');
    setApiTestResult('正在测试API连接...');
    
    try {
      const result = await testApiConnection();
      if (result.success) {
        setApiTestStatus('success');
        setApiTestResult(`API连接成功: ${result.message}`);
      } else {
        setApiTestStatus('error');
        setApiTestResult(`API连接失败: ${result.message}`);
      }
    } catch (error) {
      setApiTestStatus('error');
      setApiTestResult(`API测试出错: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Load recent movies from local storage on client side
  useEffect(() => {
    try {
      const recentMovieIds = JSON.parse(localStorage.getItem('nextbus_recent_movies') || '[]');
      
      // Fetch movie data for each ID
      const fetchMovies = async () => {
        const movies: Movie[] = [];
        
        for (const id of recentMovieIds.slice(0, 4)) { // Limit to 4 recent movies
          const movie = await getMovieData(id);
          if (movie) {
            movies.push(movie);
          }
        }
        
        setRecentMovies(movies);
        setLoading(false);
      };
      
      fetchMovies();
    } catch (error) {
      console.error('Failed to load recent movies:', error);
      setLoading(false);
    }
  }, []);

  return (
    <Layout>
      <Container>
        <h1 className="mb-4">NextBus</h1>
        <p className="lead mb-3">使用 Next.js 构建的 JavBus 浏览器</p>
        
        {/* API测试区域 */}
        <div className="mb-4 p-3 border rounded">
          <h5>API 连接测试</h5>
          <div className="d-flex align-items-center mb-2">
            <Button 
              variant="outline-primary" 
              onClick={handleTestApiConnection}
              disabled={apiTestStatus === 'loading'}
              className="me-3"
            >
              {apiTestStatus === 'loading' ? '测试中...' : '测试 API 连接'}
            </Button>
            
            {apiTestResult && (
              <div className={`${apiTestStatus === 'success' ? 'text-success' : apiTestStatus === 'error' ? 'text-danger' : ''}`}>
                {apiTestResult}
              </div>
            )}
          </div>
          <small className="text-muted">如果搜索不到结果，可先测试API连接是否正常</small>
        </div>
        
        {/* Recent movies section */}
        <h2 className="mb-3">最近浏览</h2>
        <Row>
          {loading ? (
            <Col>
              <p>正在加载最近浏览记录...</p>
            </Col>
          ) : recentMovies.length > 0 ? (
            recentMovies.map((movie) => (
              <Col key={movie.id} xs={12} sm={6} md={3} className="mb-4">
                <Link href={`/movie/${movie.id}`} passHref>
                  <Card className="h-100 movie-card">
                    <div style={{ position: 'relative', height: '280px' }}>
                      <Image
                        src={movie.image_url || '/placeholder.jpg'}
                        alt={movie.title}
                        fill
                        sizes="(max-width: 576px) 100vw, (max-width: 992px) 50vw, 25vw"
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                    <Card.Body>
                      <Card.Title style={{ fontSize: '0.9rem' }}>
                        {movie.translated_title || movie.title}
                      </Card.Title>
                      <Card.Text>
                        <small className="text-muted">{movie.id}</small>
                        <br />
                        <small className="text-muted">{movie.date}</small>
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </Link>
              </Col>
            ))
          ) : (
            <Col>
              <p>没有最近浏览记录</p>
            </Col>
          )}
        </Row>
        
        {/* Search section */}
        <div className="mt-5 p-5 bg-light rounded">
          <h2 className="mb-3">搜索电影</h2>
          <p>通过以下方式找到您想要的电影：</p>
          <Row className="mt-4">
            <Col md={4}>
              <Link href="/search" passHref className="text-decoration-none">
                <Card className="mb-3 h-100">
                  <Card.Body className="text-center">
                    <h3>ID 搜索</h3>
                    <p>使用电影 ID 精确搜索</p>
                  </Card.Body>
                </Card>
              </Link>
            </Col>
            <Col md={4}>
              <Link href="/search?type=keyword" passHref className="text-decoration-none">
                <Card className="mb-3 h-100">
                  <Card.Body className="text-center">
                    <h3>关键字搜索</h3>
                    <p>使用关键字搜索电影</p>
                  </Card.Body>
                </Card>
              </Link>
            </Col>
            <Col md={4}>
              <Link href="/search?type=actor" passHref className="text-decoration-none">
                <Card className="mb-3 h-100">
                  <Card.Body className="text-center">
                    <h3>演员搜索</h3>
                    <p>按演员姓名搜索电影</p>
                  </Card.Body>
                </Card>
              </Link>
            </Col>
          </Row>
        </div>
      </Container>
    </Layout>
  );
} 