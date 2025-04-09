'use client';

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Tabs, Tab, Badge, Table } from 'react-bootstrap';
import Layout from '../../../components/Layout';
import { getMovieData, getMagnetLinks, translateText, getMovieSummary, getWatchUrlPrefix } from '../../../lib/api';
import { Movie, MagnetLink } from '../../../lib/types';
import { isFavorite, toggleFavorite } from '../../../lib/favorites';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MovieDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const movieId = params.id;
  
  // State
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFav, setIsFav] = useState(false);
  
  // Translation state
  const [translating, setTranslating] = useState(false);
  const [translatedTitle, setTranslatedTitle] = useState('');
  const [translatedSummary, setTranslatedSummary] = useState('');
  
  // Summary state
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summary, setSummary] = useState('');
  
  // Additional state to track if summary is available
  const [summaryAvailable, setSummaryAvailable] = useState<boolean | null>(null);
  
  // Magnets state
  const [magnets, setMagnets] = useState<MagnetLink[]>([]);
  const [loadingMagnets, setLoadingMagnets] = useState(false);
  
  // Load movie data
  useEffect(() => {
    const fetchMovieData = async () => {
      setLoading(true);
      setError('');
      
      try {
        const movieData = await getMovieData(movieId);
        
        if (movieData) {
          setMovie(movieData);
          setIsFav(isFavorite(movieId));
          
          // Set translated content if available
          if (movieData.translated_title) {
            setTranslatedTitle(movieData.translated_title);
          }
          
          if (movieData.translated_summary) {
            setTranslatedSummary(movieData.translated_summary);
          }
          
          if (movieData.summary) {
            setSummary(movieData.summary);
          }
          
          // Add to recent movies in localStorage
          try {
            const recentMovies = JSON.parse(localStorage.getItem('nextbus_recent_movies') || '[]');
            // Remove if already exists
            const filteredMovies = recentMovies.filter((id: string) => id !== movieId);
            // Add to beginning
            filteredMovies.unshift(movieId);
            // Limit to 10 movies
            const limitedMovies = filteredMovies.slice(0, 10);
            localStorage.setItem('nextbus_recent_movies', JSON.stringify(limitedMovies));
          } catch (error) {
            console.error('Failed to update recent movies:', error);
          }
          
          // Get magnets if movie has gid and uc
          if (movieData.gid || movieData.uc) {
            fetchMagnets(movieData.gid, movieData.uc);
          }
        } else {
          setError(`电影 ${movieId} 不存在`);
        }
      } catch (error) {
        console.error('Failed to load movie:', error);
        setError('加载电影信息失败');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMovieData();
  }, [movieId]);
  
  // Get movie summary if none exists
  useEffect(() => {
    if (movie && !movie.summary && !loadingSummary && summary === '' && summaryAvailable !== false) {
      const fetchSummary = async () => {
        setLoadingSummary(true);
        
        try {
          const summaryData = await getMovieSummary(movieId);
          
          if (summaryData && summaryData.summary) {
            setSummary(summaryData.summary);
          }
          
          // Set the availability flag to prevent further attempts
          setSummaryAvailable(summaryData.available);
        } catch (error) {
          console.error('Failed to load summary:', error);
          // Mark as unavailable to prevent further attempts
          setSummaryAvailable(false);
        } finally {
          setLoadingSummary(false);
        }
      };
      
      fetchSummary();
    }
  }, [movie, movieId, loadingSummary, summary, summaryAvailable]);
  
  // Fetch magnet links
  const fetchMagnets = async (gid?: string, uc?: string) => {
    setLoadingMagnets(true);
    
    try {
      const magnetLinks = await getMagnetLinks(movieId, gid, uc);
      setMagnets(magnetLinks);
    } catch (error) {
      console.error('Failed to load magnets:', error);
    } finally {
      setLoadingMagnets(false);
    }
  };
  
  // Handle favorite toggle
  const handleToggleFavorite = () => {
    const newStatus = toggleFavorite(movieId);
    setIsFav(newStatus);
  };
  
  // Handle title translation
  const handleTranslateTitle = async () => {
    if (!movie || !movie.title || translating || translatedTitle) return;
    
    setTranslating(true);
    
    try {
      const translated = await translateText(movie.title, false, movieId);
      
      if (translated) {
        setTranslatedTitle(translated);
      }
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setTranslating(false);
    }
  };
  
  // Handle summary translation
  const handleTranslateSummary = async () => {
    if (!summary || translating || translatedSummary) return;
    
    setTranslating(true);
    
    try {
      const translated = await translateText(summary, true, movieId);
      
      if (translated) {
        setTranslatedSummary(translated);
      }
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setTranslating(false);
    }
  };
  
  // Handle playback
  const handleWatchMovie = () => {
    if (movie) {
      router.push(`/video/${movie.id}`);
    }
  };
  
  if (loading) {
    return (
      <Layout>
        <Container>
          <p>正在加载电影信息...</p>
        </Container>
      </Layout>
    );
  }
  
  if (error) {
    return (
      <Layout>
        <Container>
          <div className="alert alert-danger">{error}</div>
        </Container>
      </Layout>
    );
  }
  
  if (!movie) {
    return (
      <Layout>
        <Container>
          <div className="alert alert-warning">未找到电影信息</div>
        </Container>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <Container>
        {/* Movie header */}
        <div className="position-relative mb-4">
          <h1 className="mb-0">
            {translatedTitle || movie.title}
            {translatedTitle && <small className="d-block text-muted">{movie.title}</small>}
          </h1>
          
          {!translatedTitle && movie.title && (
            <Button 
              variant="outline-secondary" 
              size="sm" 
              className="mt-2" 
              onClick={handleTranslateTitle}
              disabled={translating}
            >
              {translating ? '翻译中...' : '翻译标题'}
            </Button>
          )}
          
          <Button
            variant={isFav ? 'danger' : 'outline-danger'}
            className="position-absolute top-0 end-0"
            onClick={handleToggleFavorite}
          >
            {isFav ? '❤️ 已收藏' : '🤍 收藏'}
          </Button>
        </div>
        
        {/* Movie metadata - Replace table with inline display */}
        <div className="mb-4">
          <div className="d-flex flex-wrap align-items-center gap-2">
            {movie.id && (
              <span className="badge bg-primary">{movie.id}</span>
            )}
            {movie.date && (
              <span className="badge bg-secondary">{movie.date}</span>
            )}
            {(movie.producer_obj || movie.producer) && (
              movie.producer_obj && movie.producer_obj.id ? (
                <Link href={`/filter?filterType=studio&filterValue=${movie.producer_obj.id}`}>
                  <span className="badge bg-info">{movie.producer_obj.name}</span>
                </Link>
              ) : (
                <span className="badge bg-info">{movie.producer}</span>
              )
            )}
            {(movie.publisher_obj || movie.publisher) && (
              movie.publisher_obj && movie.publisher_obj.id ? (
                <Link href={`/filter?filterType=label&filterValue=${movie.publisher_obj.id}`}>
                  <span className="badge bg-info">{movie.publisher_obj.name}</span>
                </Link>
              ) : (
                <span className="badge bg-info">{movie.publisher}</span>
              )
            )}
            {(movie.director_obj || movie.director) && (
              movie.director_obj && movie.director_obj.id ? (
                <Link href={`/filter?filterType=director&filterValue=${movie.director_obj.id}`}>
                  <span className="badge bg-info">{movie.director_obj.name}</span>
                </Link>
              ) : (
                <span className="badge bg-info">{movie.director}</span>
              )
            )}
            {(movie.series_obj || movie.series) && (
              movie.series_obj && movie.series_obj.id ? (
                <Link href={`/filter?filterType=series&filterValue=${movie.series_obj.id}`}>
                  <span className="badge bg-info">{movie.series_obj.name}</span>
                </Link>
              ) : (
                <span className="badge bg-info">{movie.series}</span>
              )
            )}
            {movie.videoLength && (
              <span className="badge bg-secondary">{movie.videoLength} 分钟</span>
            )}
          </div>
        </div>
        
        {/* Main content */}
        <Row>
          {/* Left column - cover and actions */}
          <Col md={5} className="mb-4">
            {/* Modified container with proper aspect ratio (800:538) */}
            <div className="position-relative" style={{ 
              height: '0', 
              paddingBottom: '67.25%', /* 538/800 = 0.6725 = 67.25% */
              background: '#f8f9fa',
              borderRadius: '0.25rem',
              overflow: 'hidden'
            }}>
              <Image
                src={`/api/images/${movie.id}/cover.jpg`}
                alt={movie.title}
                fill
                sizes="(max-width: 576px) 100vw, (max-width: 992px) 50vw, 33vw"
                style={{ objectFit: 'contain' }}
                className="rounded"
              />
            </div>
            
            <div className="mt-3">
              <Button 
                variant="primary" 
                className="w-100 mb-2 d-flex align-items-center justify-content-center gap-2"
                onClick={handleWatchMovie}
              >
                <i className="fas fa-play-circle"></i> 在线观看
                <span className="badge bg-success ms-1">✓ 可用</span>
              </Button>
              
              <Button 
                variant="outline-secondary" 
                className="w-100"
                as="a" 
                href={`${getWatchUrlPrefix()}/${movie.id}`} 
                target="_blank"
                rel="noopener noreferrer"
              >
                前往原站
              </Button>
            </div>
          </Col>
          
          {/* Right column - details and tabs */}
          <Col md={7}>
            <Tabs defaultActiveKey="info" className="mb-4">
              {/* Info tab */}
              <Tab eventKey="info" title="影片信息">
                {/* Genres */}
                {((movie.genres_obj && movie.genres_obj.length > 0) || (movie.genres && movie.genres.length > 0)) && (
                  <div className="mb-4">
                    <h5>类别</h5>
                    <div>
                      {movie.genres_obj && movie.genres_obj.length > 0 ? (
                        movie.genres_obj.map((genre, index) => (
                          <Link key={index} href={`/filter?filterType=genre&filterValue=${genre.id}`}>
                            <Badge 
                              bg="warning" 
                              text="white"
                              className="me-1 mb-1"
                            >
                              {genre.name}
                            </Badge>
                          </Link>
                        ))
                      ) : (
                        movie.genres && movie.genres.map((genre, index) => (
                          <Badge 
                            key={index} 
                            bg="warning"
                            text="white"
                            className="me-1 mb-1"
                          >
                            {genre}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                )}
                
                {/* Actors */}
                {movie.actors && movie.actors.length > 0 && (
                  <div className="mb-4">
                    <h5>演员</h5>
                    <Row>
                      {movie.actors.map((actor) => (
                        <Col key={actor.id} xs={6} sm={4} md={4} lg={3} className="mb-3">
                          <Link href={`/filter?filterType=star&filterValue=${actor.id}`} legacyBehavior passHref>
                            <a className="text-decoration-none">
                              <Card className="actor-card h-100">
                                <div style={{ position: 'relative', height: '120px' }}>
                                  {actor.image_url ? (
                                    <Image
                                      src={`/api/images/${movie.id}/actor_${actor.id}.jpg`}
                                      alt={actor.name}
                                      fill
                                      sizes="(max-width: 576px) 50vw, (max-width: 992px) 25vw, 16vw"
                                      style={{ objectFit: 'cover' }}
                                      onError={(e) => {
                                        // If image fails to load, replace with placeholder
                                        const target = e.target as HTMLImageElement;
                                        target.src = '/placeholder.jpg';
                                        target.onerror = null; // Prevent infinite error loops
                                      }}
                                    />
                                  ) : (
                                    <div 
                                      className="d-flex justify-content-center align-items-center bg-light h-100 w-100"
                                      style={{ position: 'absolute' }}
                                    >
                                      <span className="text-muted">{actor.name.charAt(0)}</span>
                                    </div>
                                  )}
                                </div>
                                <Card.Body className="p-2 text-center">
                                  <Card.Title style={{ fontSize: '0.9rem' }}>{actor.name}</Card.Title>
                                </Card.Body>
                              </Card>
                            </a>
                          </Link>
                        </Col>
                      ))}
                    </Row>
                  </div>
                )}
                
                {/* Summary */}
                <div className="mb-4">
                  <h5>影片简介</h5>
                  {loadingSummary ? (
                    <p>正在加载简介...</p>
                  ) : summary ? (
                    <>
                      <p style={{ whiteSpace: 'pre-line' }}>{summary}</p>
                      
                      {translatedSummary ? (
                        <div className="mt-3">
                          <h6>中文翻译</h6>
                          <p style={{ whiteSpace: 'pre-line' }}>{translatedSummary}</p>
                        </div>
                      ) : (
                        <Button 
                          variant="outline-secondary" 
                          size="sm" 
                          onClick={handleTranslateSummary}
                          disabled={translating}
                        >
                          {translating ? '翻译中...' : '翻译简介'}
                        </Button>
                      )}
                    </>
                  ) : summaryAvailable === false ? (
                    <p>无法获取影片简介</p>
                  ) : (
                    <p>暂无简介</p>
                  )}
                </div>
              </Tab>
              
              {/* Sample images tab */}
              <Tab eventKey="samples" title="样品图像">
                {movie.sample_images && movie.sample_images.length > 0 ? (
                  <div className="mt-3">
                    <Row>
                      {movie.sample_images.map((sample) => (
                        <Col key={sample.index} xs={12} sm={6} md={4} className="mb-3">
                          <div className="position-relative" style={{ height: '200px' }}>
                            <Image
                              src={sample.url}
                              alt={`样品图 ${sample.index}`}
                              fill
                              sizes="(max-width: 576px) 100vw, (max-width: 992px) 50vw, 33vw"
                              style={{ objectFit: 'cover' }}
                              className="rounded"
                            />
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </div>
                ) : (
                  <p className="mt-3">暂无样品图像</p>
                )}
              </Tab>
              
              {/* Magnets tab */}
              <Tab eventKey="magnets" title="磁力链接">
                {loadingMagnets ? (
                  <p className="mt-3">正在加载磁力链接...</p>
                ) : magnets.length > 0 ? (
                  <div className="mt-3">
                    <div className="table-responsive">
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th>质量</th>
                            <th>名称</th>
                            <th>大小</th>
                            <th>日期</th>
                            <th>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {magnets.map((magnet, index) => (
                            <tr key={index}>
                              <td>
                                {magnet.is_hd && <Badge bg="success" className="me-1">HD</Badge>}
                                {magnet.has_subtitle && <Badge bg="info">字幕</Badge>}
                              </td>
                              <td>{magnet.name}</td>
                              <td>{magnet.size}</td>
                              <td>{magnet.date}</td>
                              <td>
                                <a 
                                  href={magnet.link} 
                                  className="btn btn-sm btn-outline-primary"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  磁力
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3">未找到磁力链接</p>
                )}
              </Tab>
            </Tabs>
          </Col>
        </Row>
      </Container>
    </Layout>
  );
} 