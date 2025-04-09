'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Container, Row, Col, Form, Button, Card, Pagination } from 'react-bootstrap';
import Layout from '../../components/Layout';
import { getMovieData, searchMovies, searchActors, getActorData, getActorMovies } from '../../lib/api';
import { Movie, Actor, PaginationInfo } from '../../lib/types';
import Link from 'next/link';
import Image from 'next/image';

type SearchType = 'id' | 'keyword' | 'actor';

export default function Search() {
  const searchParams = useSearchParams();
  
  // Search parameters
  const [searchType, setSearchType] = useState<SearchType>('id');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Search results
  const [movie, setMovie] = useState<Movie | null>(null);
  const [keywordResults, setKeywordResults] = useState<Movie[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [actors, setActors] = useState<Actor[]>([]);
  const [actor, setActor] = useState<Actor | null>(null);
  const [actorMovies, setActorMovies] = useState<Movie[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 调试信息
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(process.env.NEXT_PUBLIC_DEBUG === 'true');
  
  // 添加调试信息的函数
  const addDebugInfo = (info: string) => {
    console.log(`[DEBUG] ${info}`);
    setDebugInfo(prev => [info, ...prev.slice(0, 19)]); // 保留最近20条
  };
  
  // Initialize from URL parameters
  useEffect(() => {
    const id = searchParams.get('id');
    const keyword = searchParams.get('keyword');
    const actor = searchParams.get('name');
    const page = searchParams.get('page');
    const type = searchParams.get('type');
    
    const logMsg = `[Search] URL参数: id=${id}, keyword=${keyword}, actor=${actor}, page=${page}, type=${type}`;
    console.log(logMsg);
    addDebugInfo(logMsg);
    
    if (page && !isNaN(parseInt(page))) {
      setCurrentPage(parseInt(page));
    }
    
    if (type === 'keyword') {
      setSearchType('keyword');
      if (keyword) {
        setSearchQuery(keyword);
        handleKeywordSearch(keyword, currentPage);
      }
    } else if (type === 'actor') {
      setSearchType('actor');
      if (actor) {
        setSearchQuery(actor);
        handleActorSearch(actor);
      }
    } else {
      setSearchType('id');
      if (id) {
        setSearchQuery(id);
        handleIdSearch(id);
      }
    }
  }, [searchParams]);
  
  // Handler for ID search
  const handleIdSearch = async (id: string) => {
    setLoading(true);
    setError('');
    setMovie(null);
    
    const logMsg = `[Search] 开始搜索影片ID: ${id}`;
    console.log(logMsg);
    addDebugInfo(logMsg);
    
    try {
      const movieData = await getMovieData(id);
      
      const resultMsg = movieData 
        ? `[Search] 获取到影片数据: ${movieData.id} - ${movieData.title}` 
        : `[Search] 未找到影片ID: ${id}`;
      console.log(resultMsg);
      addDebugInfo(resultMsg);
      
      if (movieData) {
        setMovie(movieData);
        
        // Add to recent movies in localStorage
        try {
          const recentMovies = JSON.parse(localStorage.getItem('nextbus_recent_movies') || '[]');
          // Remove if already exists
          const filteredMovies = recentMovies.filter((movieId: string) => movieId !== id);
          // Add to beginning
          filteredMovies.unshift(id);
          // Limit to 10 movies
          const limitedMovies = filteredMovies.slice(0, 10);
          localStorage.setItem('nextbus_recent_movies', JSON.stringify(limitedMovies));
        } catch (error) {
          console.error('Failed to update recent movies:', error);
        }
      } else {
        setError(`没有找到 ID 为 ${id} 的电影`);
      }
    } catch (error) {
      const errorMsg = `[Search] 搜索错误: ${error instanceof Error ? error.message : String(error)}`;
      console.error(errorMsg);
      addDebugInfo(errorMsg);
      setError('搜索过程中发生错误');
    } finally {
      setLoading(false);
    }
  };
  
  // Handler for keyword search
  const handleKeywordSearch = async (keyword: string, page: number = 1) => {
    setLoading(true);
    setError('');
    setKeywordResults([]);
    setPagination(null);
    
    try {
      const results = await searchMovies(keyword, page);
      console.log('[Search] 关键词搜索结果:', results);
      
      if (results && results.movies && results.movies.length > 0) {
        setKeywordResults(results.movies);
        
        // 修复类型问题，确保pagination对象有所有必需的属性
        if (results.pagination && typeof results.pagination.current_page === 'number') {
          setPagination(results.pagination as PaginationInfo);
        } else {
          setPagination(null);
        }
      } else {
        setError(`没有找到包含关键字 "${keyword}" 的电影`);
      }
    } catch (error) {
      console.error('Keyword search error:', error);
      setError('关键字搜索过程中发生错误');
    } finally {
      setLoading(false);
    }
  };
  
  // Handler for actor search
  const handleActorSearch = async (name: string) => {
    setLoading(true);
    setError('');
    setActors([]);
    setActor(null);
    setActorMovies([]);
    
    try {
      const actorResults = await searchActors(name);
      
      if (actorResults && actorResults.length > 0) {
        setActors(actorResults);
        
        // If exactly one actor found, show their details
        if (actorResults.length === 1) {
          await handleActorSelect(actorResults[0].id);
        }
      } else {
        setError(`没有找到名为 "${name}" 的演员`);
      }
    } catch (error) {
      console.error('Actor search error:', error);
      setError('演员搜索过程中发生错误');
    } finally {
      setLoading(false);
    }
  };
  
  // Handler for actor selection
  const handleActorSelect = async (actorId: string) => {
    setLoading(true);
    setError('');
    setActor(null);
    setActorMovies([]);
    
    try {
      const [actorData, movies] = await Promise.all([
        getActorData(actorId),
        getActorMovies(actorId)
      ]);
      
      if (actorData) {
        setActor(actorData);
        setActorMovies(movies);
      } else {
        setError(`没有找到 ID 为 ${actorId} 的演员信息`);
      }
    } catch (error) {
      console.error('Actor details error:', error);
      setError('获取演员详情过程中发生错误');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle search form submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    if (searchType === 'id') {
      handleIdSearch(searchQuery.trim());
    } else if (searchType === 'keyword') {
      handleKeywordSearch(searchQuery.trim());
    } else if (searchType === 'actor') {
      handleActorSearch(searchQuery.trim());
    }
  };
  
  // Render pagination component
  const renderPagination = () => {
    if (!pagination) return null;
    
    const handlePageChange = (page: number) => {
      setCurrentPage(page);
      handleKeywordSearch(searchQuery, page);
    };
    
    return (
      <div className="d-flex justify-content-center mt-4">
        <Pagination>
          {pagination.current_page > 1 && (
            <Pagination.Prev onClick={() => handlePageChange(pagination.current_page - 1)} />
          )}
          
          {pagination.pages.map(page => (
            <Pagination.Item 
              key={page} 
              active={page === pagination.current_page}
              onClick={() => handlePageChange(page)}
            >
              {page}
            </Pagination.Item>
          ))}
          
          {pagination.has_next && (
            <Pagination.Next onClick={() => handlePageChange(pagination.next_page)} />
          )}
        </Pagination>
      </div>
    );
  };
  
  return (
    <Layout>
      <Container>
        <h1 className="mb-4">搜索</h1>
        
        {/* Debug information */}
        {showDebug && debugInfo.length > 0 && (
          <div className="mb-4 p-3 bg-light border rounded">
            <div className="d-flex justify-content-between mb-2">
              <h5 className="m-0">调试信息</h5>
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={() => setDebugInfo([])}
              >
                清除
              </Button>
            </div>
            <div style={{maxHeight: '200px', overflowY: 'auto'}}>
              {debugInfo.map((info, index) => (
                <div key={index} className="border-bottom py-1">
                  <small>{info}</small>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Search form */}
        <Card className="mb-4">
          <Card.Body>
            <Form onSubmit={handleSearchSubmit}>
              <Row className="align-items-end">
                <Col md={2}>
                  <Form.Group className="mb-3 mb-md-0">
                    <Form.Label>搜索类型</Form.Label>
                    <Form.Select 
                      value={searchType} 
                      onChange={(e) => setSearchType(e.target.value as SearchType)}
                    >
                      <option value="id">影片 ID</option>
                      <option value="keyword">关键字</option>
                      <option value="actor">演员</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={8}>
                  <Form.Group className="mb-3 mb-md-0">
                    <Form.Label>
                      {searchType === 'id' ? '影片 ID' : 
                       searchType === 'keyword' ? '关键字' : '演员名称'}
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder={
                        searchType === 'id' ? '输入影片 ID...' : 
                        searchType === 'keyword' ? '输入关键字...' : '输入演员名称...'
                      }
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Button 
                    variant="primary" 
                    type="submit" 
                    className="w-100" 
                    disabled={loading}
                  >
                    {loading ? '搜索中...' : '搜索'}
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>
        
        {/* Error message */}
        {error && (
          <div className="alert alert-danger mb-4">{error}</div>
        )}
        
        {/* ID search results */}
        {searchType === 'id' && movie && (
          <div className="mb-5">
            <Card>
              <Row className="g-0">
                <Col md={3}>
                  <div style={{ position: 'relative', height: '100%', minHeight: '300px' }}>
                    <Image
                      src={movie.image_url || '/placeholder.jpg'}
                      alt={movie.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                </Col>
                <Col md={9}>
                  <Card.Body>
                    <h2>{movie.translated_title || movie.title}</h2>
                    <p className="text-muted">{movie.id} | {movie.date}</p>
                    
                    {movie.genres && movie.genres.length > 0 && (
                      <div className="mb-3">
                        <h5>类别</h5>
                        <div>
                          {movie.genres.map((genre, index) => (
                            <span key={index} className="badge bg-secondary me-1 mb-1">
                              {genre}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {movie.actors && movie.actors.length > 0 && (
                      <div className="mb-3">
                        <h5>演员</h5>
                        <div>
                          {movie.actors.map((actor) => (
                            <Link 
                              key={actor.id} 
                              href={`/search?type=actor&name=${encodeURIComponent(actor.name)}`}
                              className="text-decoration-none me-2"
                            >
                              <span className="badge bg-info">{actor.name}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <Link href={`/movie/${movie.id}`} passHref>
                      <Button variant="primary">查看详情</Button>
                    </Link>
                  </Card.Body>
                </Col>
              </Row>
            </Card>
          </div>
        )}
        
        {/* Keyword search results */}
        {searchType === 'keyword' && keywordResults.length > 0 && (
          <div className="mb-5">
            <h2 className="mb-3">搜索结果</h2>
            <Row>
              {keywordResults.map((movie) => (
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
              ))}
            </Row>
            
            {/* Pagination */}
            {renderPagination()}
          </div>
        )}
        
        {/* Actor search results - multiple actors */}
        {searchType === 'actor' && actors.length > 1 && !actor && (
          <div className="mb-5">
            <h2 className="mb-3">演员搜索结果</h2>
            <Row>
              {actors.map((actor) => (
                <Col key={actor.id} xs={12} sm={6} md={3} className="mb-4">
                  <Card 
                    className="h-100 actor-card"
                    onClick={() => handleActorSelect(actor.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ position: 'relative', height: '200px' }}>
                      <Image
                        src={actor.image_url || '/placeholder.jpg'}
                        alt={actor.name}
                        fill
                        sizes="(max-width: 576px) 100vw, (max-width: 992px) 50vw, 25vw"
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                    <Card.Body className="text-center">
                      <Card.Title>{actor.name}</Card.Title>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}
        
        {/* Actor details with movies */}
        {searchType === 'actor' && actor && (
          <div className="mb-5">
            <Card className="mb-4">
              <Row className="g-0">
                <Col md={3}>
                  <div style={{ position: 'relative', height: '100%', minHeight: '300px' }}>
                    <Image
                      src={actor.image_url || '/placeholder.jpg'}
                      alt={actor.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                </Col>
                <Col md={9}>
                  <Card.Body>
                    <h2>{actor.name}</h2>
                    
                    {actor.birthdate && (
                      <p><strong>生日:</strong> {actor.birthdate} {actor.age && `(${actor.age}岁)`}</p>
                    )}
                    
                    {actor.height && (
                      <p><strong>身高:</strong> {actor.height}</p>
                    )}
                    
                    {actor.measurements && (
                      <p><strong>三围:</strong> {actor.measurements}</p>
                    )}
                    
                    {actor.birthplace && (
                      <p><strong>出生地:</strong> {actor.birthplace}</p>
                    )}
                    
                    {actor.hobby && (
                      <p><strong>爱好:</strong> {actor.hobby}</p>
                    )}
                  </Card.Body>
                </Col>
              </Row>
            </Card>
            
            <h3 className="mb-3">出演作品</h3>
            <Row>
              {actorMovies.length > 0 ? (
                actorMovies.map((movie) => (
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
                  <p>没有找到该演员的相关作品</p>
                </Col>
              )}
            </Row>
          </div>
        )}
      </Container>
    </Layout>
  );
} 