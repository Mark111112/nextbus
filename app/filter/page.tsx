'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Container, Row, Col, Card, Pagination, Badge } from 'react-bootstrap';
import Layout from '../../components/Layout';
import { searchMovies } from '../../lib/api';
import { Movie, PaginationInfo } from '../../lib/types';
import Link from 'next/link';
import Image from 'next/image';

// Create a separate component for the filter functionality
function FilterContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Filter parameters
  const [filterType, setFilterType] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [includeMagnetless, setIncludeMagnetless] = useState(false);
  const [uncensoredOnly, setUncensoredOnly] = useState(false);
  
  // Filter results
  const [movies, setMovies] = useState<Movie[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [filterInfo, setFilterInfo] = useState<{ name?: string, type?: string, value?: string } | null>(null);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Initialize from URL parameters
  useEffect(() => {
    const type = searchParams.get('filterType') || '';
    const value = searchParams.get('filterValue') || '';
    const page = searchParams.get('page');
    const magnet = searchParams.get('magnet') || 'exist';
    const movieType = searchParams.get('type') || 'normal';
    
    setFilterType(type);
    setFilterValue(value);
    setIncludeMagnetless(magnet === 'all');
    setUncensoredOnly(movieType === 'uncensored');
    
    if (page && !isNaN(parseInt(page))) {
      setCurrentPage(parseInt(page));
    } else {
      setCurrentPage(1);
    }
    
    if (type && value) {
      fetchFilteredMovies(type, value, page ? parseInt(page) : 1, magnet, movieType);
    } else {
      setError('缺少筛选参数，请提供 filterType 和 filterValue');
    }
  }, [searchParams]);
  
  // Fetch filtered movies
  const fetchFilteredMovies = async (
    type: string,
    value: string,
    page: number = 1,
    magnet: string = 'exist',
    movieType: string = 'normal'
  ) => {
    setLoading(true);
    setError('');
    setMovies([]);
    setPagination(null);
    setFilterInfo(null);
    
    try {
      // Use the searchMovies function with empty keyword but with filter parameters
      const results = await searchMovies('', page, magnet, movieType, type, value);
      
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
        setError(`没有找到符合筛选条件的影片: ${type}=${value}`);
      }
    } catch (error) {
      console.error('Filter error:', error);
      setError('筛选过程中发生错误');
    } finally {
      setLoading(false);
    }
  };
  
  // Render pagination controls
  const renderPagination = () => {
    if (!pagination) return null;
    
    const handlePageChange = (page: number) => {
      if (page === currentPage) return;
      
      const params = new URLSearchParams(searchParams as any);
      params.set('page', page.toString());
      
      router.push(`/filter?${params.toString()}`);
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
        <h1 className="mb-4">筛选结果</h1>
        
        {/* Filter info */}
        {filterInfo && (
          <div className="alert alert-info mb-4">
            <h5 className="mb-1">当前筛选:</h5>
            <p className="mb-0">
              {filterInfo.type === 'star' && '演员: '}
              {filterInfo.type === 'genre' && '类别: '}
              {filterInfo.type === 'director' && '导演: '}
              {filterInfo.type === 'studio' && '制作商: '}
              {filterInfo.type === 'label' && '发行商: '}
              {filterInfo.type === 'series' && '系列: '}
              <strong>{filterInfo.name}</strong>
              {includeMagnetless && <Badge bg="secondary" className="ms-2">包含无磁力影片</Badge>}
              {uncensoredOnly && <Badge bg="primary" className="ms-2">无码影片</Badge>}
            </p>
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="alert alert-warning mb-4">{error}</div>
        )}
        
        {/* Loading indicator */}
        {loading && (
          <div className="text-center my-5">
            <p>正在加载结果...</p>
          </div>
        )}
        
        {/* Results */}
        {!loading && movies.length > 0 && (
          <>
            <Row>
              {movies.map((movie) => (
                <Col key={movie.id} xs={6} sm={4} md={3} className="mb-4">
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
                          {movie.tags && movie.tags.length > 0 && (
                            <div className="mt-1">
                              {movie.tags.map((tag, index) => (
                                <Badge key={index} bg="secondary" className="me-1">{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  </Link>
                </Col>
              ))}
            </Row>
            
            {/* Pagination */}
            {renderPagination()}
          </>
        )}
      </Container>
    </Layout>
  );
}

// Main component with Suspense boundary
export default function Filter() {
  return (
    <Suspense fallback={
      <Layout>
        <Container>
          <div className="text-center my-5">
            <p>正在加载筛选页面...</p>
          </div>
        </Container>
      </Layout>
    }>
      <FilterContent />
    </Suspense>
  );
} 