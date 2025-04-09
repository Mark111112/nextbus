'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Container, Row, Col, Form, Button, Card, Pagination } from 'react-bootstrap';
import Layout from '../../components/Layout';
import { getMovieData, searchMovies, searchActors, getActorData, getActorMovies } from '../../lib/api';
import { Movie, Actor, PaginationInfo } from '../../lib/types';
import Link from 'next/link';
import Image from 'next/image';

type SearchType = 'id' | 'keyword' | 'actor';

// Create a separate component for the search functionality
function SearchContent() {
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
  
  // Render search form
  const renderSearchForm = () => {
    return (
      <Form onSubmit={handleSearchSubmit} className="mb-4">
        <Row className="g-3">
          <Col md={4}>
            <Form.Group>
              <Form.Label>搜索类型</Form.Label>
              <Form.Select 
                value={searchType} 
                onChange={(e) => setSearchType(e.target.value as SearchType)}
              >
                <option value="id">影片ID</option>
                <option value="keyword">关键词</option>
                <option value="actor">演员</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>搜索内容</Form.Label>
              <Form.Control
                type="text"
                placeholder={searchType === 'id' ? "输入影片ID" : searchType === 'keyword' ? "输入关键词" : "输入演员姓名"}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={2} className="d-flex align-items-end">
            <Button variant="primary" type="submit" className="w-100">
              搜索
            </Button>
          </Col>
        </Row>
      </Form>
    );
  };
  
  // Render movie details
  const renderMovieDetails = () => {
    if (!movie) return null;
    
    return (
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={3}>
              {movie.poster_path ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  alt={movie.title}
                  width={300}
                  height={450}
                  className="img-fluid rounded"
                />
              ) : (
                <div className="bg-light d-flex align-items-center justify-content-center" style={{ height: '450px' }}>
                  <span className="text-muted">无海报</span>
                </div>
              )}
            </Col>
            <Col md={9}>
              <h2>{movie.title}</h2>
              <p className="text-muted">{movie.release_date}</p>
              <p>{movie.overview}</p>
              
              <h5 className="mt-4">演员</h5>
              <div className="d-flex flex-wrap gap-2">
                {movie.credits?.cast?.slice(0, 5).map((actor: { id: string; name: string }) => (
                  <Link href={`/search?type=actor&name=${encodeURIComponent(actor.name)}`} key={actor.id}>
                    <Button variant="outline-secondary" size="sm">
                      {actor.name}
                    </Button>
                  </Link>
                ))}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    );
  };
  
  // Render keyword search results
  const renderKeywordResults = () => {
    if (keywordResults.length === 0) return null;
    
    return (
      <div>
        <h3 className="mb-3">搜索结果</h3>
        <Row xs={1} md={2} lg={3} className="g-4">
          {keywordResults.map(movie => (
            <Col key={movie.id}>
              <Card className="h-100">
                {movie.poster_path ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
                    alt={movie.title}
                    width={185}
                    height={278}
                    className="card-img-top"
                  />
                ) : (
                  <div className="bg-light d-flex align-items-center justify-content-center" style={{ height: '278px' }}>
                    <span className="text-muted">无海报</span>
                  </div>
                )}
                <Card.Body>
                  <Card.Title>{movie.title}</Card.Title>
                  <Card.Text className="text-muted">{movie.release_date}</Card.Text>
                  <Link href={`/search?type=id&id=${movie.id}`}>
                    <Button variant="primary" size="sm">查看详情</Button>
                  </Link>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
        {renderPagination()}
      </div>
    );
  };
  
  // Render actor search results
  const renderActorResults = () => {
    if (actors.length === 0 && !actor) return null;
    
    if (actor) {
      return (
        <div>
          <Card className="mb-4">
            <Card.Body>
              <Row>
                <Col md={3}>
                  {actor.profile_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w500${actor.profile_path}`}
                      alt={actor.name}
                      width={300}
                      height={450}
                      className="img-fluid rounded"
                    />
                  ) : (
                    <div className="bg-light d-flex align-items-center justify-content-center" style={{ height: '450px' }}>
                      <span className="text-muted">无照片</span>
                    </div>
                  )}
                </Col>
                <Col md={9}>
                  <h2>{actor.name}</h2>
                  <p>{actor.biography}</p>
                </Col>
              </Row>
            </Card.Body>
          </Card>
          
          <h3 className="mb-3">参演电影</h3>
          <Row xs={1} md={2} lg={3} className="g-4">
            {actorMovies.map(movie => (
              <Col key={movie.id}>
                <Card className="h-100">
                  {movie.poster_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
                      alt={movie.title}
                      width={185}
                      height={278}
                      className="card-img-top"
                    />
                  ) : (
                    <div className="bg-light d-flex align-items-center justify-content-center" style={{ height: '278px' }}>
                      <span className="text-muted">无海报</span>
                    </div>
                  )}
                  <Card.Body>
                    <Card.Title>{movie.title}</Card.Title>
                    <Card.Text className="text-muted">{movie.release_date}</Card.Text>
                    <Link href={`/search?type=id&id=${movie.id}`}>
                      <Button variant="primary" size="sm">查看详情</Button>
                    </Link>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      );
    }
    
    return (
      <div>
        <h3 className="mb-3">演员搜索结果</h3>
        <Row xs={1} md={2} lg={3} className="g-4">
          {actors.map(actor => (
            <Col key={actor.id}>
              <Card className="h-100">
                {actor.profile_path ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                    alt={actor.name}
                    width={185}
                    height={278}
                    className="card-img-top"
                  />
                ) : (
                  <div className="bg-light d-flex align-items-center justify-content-center" style={{ height: '278px' }}>
                    <span className="text-muted">无照片</span>
                  </div>
                )}
                <Card.Body>
                  <Card.Title>{actor.name}</Card.Title>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => handleActorSelect(actor.id)}
                  >
                    查看详情
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  };
  
  // Render debug information
  const renderDebugInfo = () => {
    if (!showDebug) return null;
    
    return (
      <div className="mt-4 p-3 bg-light rounded">
        <h5>调试信息</h5>
        <div className="d-flex justify-content-between mb-2">
          <Button 
            variant="outline-secondary" 
            size="sm"
            onClick={() => setShowDebug(false)}
          >
            隐藏调试信息
          </Button>
          <Button 
            variant="outline-secondary" 
            size="sm"
            onClick={() => setDebugInfo([])}
          >
            清除调试信息
          </Button>
        </div>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {debugInfo.map((info, index) => (
            <div key={index} className="mb-1">
              <small>{info}</small>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <Layout>
      <Container className="py-4">
        <h1 className="mb-4">电影搜索</h1>
        
        {renderSearchForm()}
        
        {loading && (
          <div className="text-center my-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">加载中...</span>
            </div>
            <p className="mt-2">正在搜索，请稍候...</p>
          </div>
        )}
        
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        
        {!loading && (
          <>
            {renderMovieDetails()}
            {renderKeywordResults()}
            {renderActorResults()}
          </>
        )}
        
        {renderDebugInfo()}
      </Container>
    </Layout>
  );
}

// Main component with Suspense boundary
export default function Search() {
  return (
    <Suspense fallback={
      <Layout>
        <Container className="py-4">
          <div className="text-center my-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">加载中...</span>
            </div>
            <p className="mt-2">正在加载搜索页面...</p>
          </div>
        </Container>
      </Layout>
    }>
      <SearchContent />
    </Suspense>
  );
} 