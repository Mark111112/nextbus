'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Container, Row, Col, Form, Button, Card, Pagination, InputGroup } from 'react-bootstrap';
import Layout from '../../components/Layout';
import { searchMovies } from '../../lib/api';
import { Movie, PaginationInfo } from '../../lib/types';
import Link from 'next/link';
import Image from 'next/image';

// Create a separate component for the search functionality
function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Search parameters
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Search results
  const [movies, setMovies] = useState<Movie[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Initialize from URL parameters
  useEffect(() => {
    const keyword = searchParams.get('keyword') || '';
    const page = searchParams.get('page');
    
    setSearchQuery(keyword);
    
    if (page && !isNaN(parseInt(page))) {
      setCurrentPage(parseInt(page));
    } else {
      setCurrentPage(1);
    }
    
    handleSearch(keyword, page ? parseInt(page) : 1);
  }, [searchParams]);
  
  // Handle search
  const handleSearch = async (keyword: string, page: number = 1) => {
    setLoading(true);
    setError('');
    setMovies([]);
    setPagination(null);
    
    try {
      const results = await searchMovies(keyword, page);
      
      if (results && results.movies && results.movies.length > 0) {
        setMovies(results.movies);
        
        if (results.pagination) {
          setPagination(results.pagination as PaginationInfo);
        } else {
          setPagination(null);
        }
      } else {
        if (keyword) {
          setError(`没有找到包含关键字 "${keyword}" 的影片`);
        } else {
          setError('无法获取影片列表');
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      setError('搜索过程中发生错误');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (searchQuery.trim() !== (searchParams.get('keyword') || '').trim() || currentPage !== parseInt(searchParams.get('page') || '1')) {
      // Update URL with new search parameters
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set('keyword', searchQuery.trim());
      }
      if (currentPage > 1) {
        params.set('page', currentPage.toString());
      }
      
      router.push(`/search${params.toString() ? `?${params.toString()}` : ''}`);
    }
  };
  
  // Render pagination controls
  const renderPagination = () => {
    if (!pagination) return null;
    
    const handlePageChange = (page: number) => {
      if (page === currentPage) return;
      
      const params = new URLSearchParams(searchParams as any);
      params.set('page', page.toString());
      
      router.push(`/search?${params.toString()}`);
    };
    
    return (
      <Pagination className="justify-content-center mt-4">
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
    );
  };
  
  return (
    <Layout>
      <Container>
        <h1 className="mb-4">影片搜索</h1>
        
        {/* Search form */}
        <Form onSubmit={handleSubmit} className="mb-4">
          <InputGroup>
            <Form.Control
              placeholder="输入影片关键词、ID等..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="搜索"
            />
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? '搜索中...' : '搜索'}
            </Button>
          </InputGroup>
          <small className="text-muted">
            提示: 留空搜索将显示所有最新影片
          </small>
        </Form>
        
        {/* Error message */}
        {error && (
          <div className="alert alert-warning mb-4">{error}</div>
        )}
        
        {/* Search results */}
        {!loading && !error && movies.length > 0 && (
          <>
            <h2 className="mb-3">
              {searchQuery ? `"${searchQuery}" 的搜索结果` : '最新影片'}
            </h2>
            
            <Row>
              {movies.map((movie) => (
                <Col key={movie.id} xs={6} sm={4} md={3} lg={3} className="mb-4">
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
              ))}
            </Row>
            
            {renderPagination()}
          </>
        )}
        
        {/* Loading indicator */}
        {loading && (
          <div className="text-center my-5">
            <p>正在加载影片数据...</p>
          </div>
        )}
      </Container>
    </Layout>
  );
}

// Main component with Suspense boundary
export default function Search() {
  return (
    <Suspense fallback={
      <Layout>
        <Container>
          <div className="text-center my-5">
            <p>正在加载搜索页面...</p>
          </div>
        </Container>
      </Layout>
    }>
      <SearchContent />
    </Suspense>
  );
} 