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
  const [includeMagnetless, setIncludeMagnetless] = useState(false);
  const [uncensoredOnly, setUncensoredOnly] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('');
  const [selectedFilterValue, setSelectedFilterValue] = useState<string>('');
  
  // Search results
  const [movies, setMovies] = useState<Movie[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [filterInfo, setFilterInfo] = useState<{ name?: string, type?: string, value?: string } | null>(null);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Initialize from URL parameters
  useEffect(() => {
    const keyword = searchParams.get('keyword') || '';
    const page = searchParams.get('page');
    const magnet = searchParams.get('magnet') || 'exist';
    const type = searchParams.get('type') || 'normal';
    const filterType = searchParams.get('filterType') || '';
    const filterValue = searchParams.get('filterValue') || '';
    
    setSearchQuery(keyword);
    setSelectedFilter(filterType);
    setSelectedFilterValue(filterValue);
    setIncludeMagnetless(magnet === 'all');
    setUncensoredOnly(type === 'uncensored');
    
    if (page && !isNaN(parseInt(page))) {
      setCurrentPage(parseInt(page));
    } else {
      setCurrentPage(1);
    }
    
    handleSearch(keyword, page ? parseInt(page) : 1, magnet, type, filterType, filterValue);
  }, [searchParams]);
  
  // Handle search
  const handleSearch = async (
    keyword: string, 
    page: number = 1, 
    magnet: string = 'exist', 
    type: string = 'normal', 
    filterType: string = '', 
    filterValue: string = ''
  ) => {
    setLoading(true);
    setError('');
    setMovies([]);
    setPagination(null);
    setFilterInfo(null);
    
    try {
      const results = await searchMovies(keyword, page, magnet, type, filterType, filterValue);
      
      if (results && results.movies && results.movies.length > 0) {
        setMovies(results.movies);
        
        if (results.pagination) {
          setPagination(results.pagination as PaginationInfo);
        } else {
          setPagination(null);
        }
        
        // Set filter info if available
        if (results.filter) {
          setFilterInfo(results.filter);
        }
      } else {
        let errorMsg = '';
        if (keyword) {
          errorMsg += `没有找到包含关键字 "${keyword}" 的影片`;
        } else if (filterType && filterValue) {
          errorMsg += `没有找到符合筛选条件的影片`;
        } else {
          errorMsg = '无法获取影片列表';
        }
        setError(errorMsg);
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
    
    // Build parameters
    const params = new URLSearchParams();
    
    if (searchQuery.trim()) {
      params.set('keyword', searchQuery.trim());
    }
    
    if (currentPage > 1) {
      params.set('page', currentPage.toString());
    }
    
    if (includeMagnetless) {
      params.set('magnet', 'all');
    }
    
    if (uncensoredOnly) {
      params.set('type', 'uncensored');
    }
    
    if (selectedFilter && selectedFilterValue) {
      params.set('filterType', selectedFilter);
      params.set('filterValue', selectedFilterValue);
    }
    
    router.push(`/search${params.toString() ? `?${params.toString()}` : ''}`);
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
        <div className="card mb-4">
          <div className="card-header bg-primary text-white">
            <h5 className="m-0">搜索选项</h5>
          </div>
          <div className="card-body">
            <Form onSubmit={handleSubmit}>
              <InputGroup className="mb-3">
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
        
        {/* Filter info */}
        {filterInfo && (
          <div className="alert alert-info mb-4">
            当前筛选: {filterInfo.name} ({filterInfo.type})
          </div>
        )}
        
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