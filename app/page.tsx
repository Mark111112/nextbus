'use client';

import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Form, InputGroup } from 'react-bootstrap';
import Layout from '../components/Layout';
import { getMovieData } from '../lib/api';
import { Movie } from '../lib/types';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [recentMovies, setRecentMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search parameters
  const [searchQuery, setSearchQuery] = useState('');
  const [includeMagnetless, setIncludeMagnetless] = useState(false);
  const [uncensoredOnly, setUncensoredOnly] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('');
  const [selectedFilterValue, setSelectedFilterValue] = useState<string>('');

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build search parameters
    const params = new URLSearchParams();
    
    if (searchQuery.trim()) {
      params.set('keyword', searchQuery.trim());
    }
    
    // Add filter parameters if selected
    if (selectedFilter && selectedFilterValue) {
      params.set('filterType', selectedFilter);
      params.set('filterValue', selectedFilterValue);
    }
    
    // Add magnet parameter if including magnetless movies
    if (includeMagnetless) {
      params.set('magnet', 'all');
    }
    
    // Add type parameter if uncensored only
    if (uncensoredOnly) {
      params.set('type', 'uncensored');
    }
    
    // Navigate to search page with parameters
    router.push(`/search${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <Layout>
      <Container>
        {/* Search section at the top */}
        <div className="card mb-4">
          <div className="card-header bg-primary text-white">
            <h3 className="m-0">关键字搜索</h3>
          </div>
          <div className="card-body">
            <Form onSubmit={handleSearch}>
              <InputGroup className="mb-3">
                <Form.Control
                  placeholder="输入关键词或留空显示全部影片"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="搜索"
                />
                <Button variant="primary" type="submit">
                  Search
                </Button>
              </InputGroup>
              
              <div className="d-flex flex-wrap align-items-center mb-3">
                <Form.Check 
                  type="checkbox" 
                  id="includeMagnetless"
                  label="包含无磁力影片" 
                  className="me-4"
                  checked={includeMagnetless}
                  onChange={(e) => setIncludeMagnetless(e.target.checked)}
                />
                
                <Form.Check 
                  type="checkbox" 
                  id="uncensoredOnly"
                  label="无码影片" 
                  className="me-4"
                  checked={uncensoredOnly}
                  onChange={(e) => setUncensoredOnly(e.target.checked)}
                />
              </div>
              
              <div>
                <h6 className="mb-2">高级筛选 (留空则不启用):</h6>
                <Row>
                  <Col xs={12} md={6} className="mb-2">
                    <Form.Select 
                      value={selectedFilter}
                      onChange={(e) => setSelectedFilter(e.target.value)}
                      aria-label="选择筛选类型"
                    >
                      <option value="">选择筛选类型...</option>
                      <option value="star">演员</option>
                      <option value="genre">类别</option>
                      <option value="director">导演</option>
                      <option value="studio">制作商</option>
                      <option value="label">发行商</option>
                      <option value="series">系列</option>
                    </Form.Select>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Control
                      placeholder="输入筛选ID值"
                      value={selectedFilterValue}
                      onChange={(e) => setSelectedFilterValue(e.target.value)}
                      disabled={!selectedFilter}
                    />
                  </Col>
                </Row>
              </div>
            </Form>
          </div>
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
                        src={movie.id ? `/api/images/${movie.id}/cover.jpg` : '/placeholder.jpg'}
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
      </Container>
    </Layout>
  );
} 