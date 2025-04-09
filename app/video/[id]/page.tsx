'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Alert, Button } from 'react-bootstrap';
import Layout from '../../../components/Layout';
import { getMovieData, getWatchUrlPrefix } from '../../../lib/api';
import { Movie } from '../../../lib/types';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';

// Dynamic import of ReactPlayer to avoid SSR issues
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

export default function VideoPlayer({ params }: { params: { id: string } }) {
  const movieId = params.id;
  
  // State
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [hlsUrl, setHlsUrl] = useState('');
  const [magnetLink, setMagnetLink] = useState('');
  const [playerError, setPlayerError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  
  // Refs
  const playerRef = useRef<any>(null);
  
  // Load movie data and setup video sources
  useEffect(() => {
    const fetchMovieData = async () => {
      setLoading(true);
      setError('');
      
      try {
        const movieData = await getMovieData(movieId);
        
        if (movieData) {
          setMovie(movieData);
          
          // Setup HLS URL using our proxy
          setHlsUrl(`/api/video-proxy/${movieId}/index.m3u8`);
          
          // Set direct URL as fallback
          setVideoUrl(`${getWatchUrlPrefix()}/${movieId}`);
          
          // Set magnet link as another fallback
          if (movieData.magnet_links && movieData.magnet_links.length > 0) {
            // Find the best magnet link (HD with subtitles if available)
            const bestMagnet = movieData.magnet_links.find(m => m.is_hd && m.has_subtitle) || 
                               movieData.magnet_links.find(m => m.is_hd) || 
                               movieData.magnet_links[0];
            setMagnetLink(bestMagnet.link);
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
  
  // Handle player error
  const handlePlayerError = (error: any) => {
    console.error('Player error:', error);
    setPlayerError('视频播放失败，请尝试重试或直接访问原站播放');
  };
  
  // Handle retry
  const handleRetry = () => {
    setPlayerError('');
    setRetryCount(prev => prev + 1);
    
    // Attempt to use a different URL format
    if (retryCount === 0) {
      setHlsUrl(`/api/video-proxy/${movieId}/playlist.m3u8`);
    } else if (retryCount === 1) {
      setHlsUrl(`/api/video-proxy/${movieId}/master.m3u8`);
    } else {
      // Try direct URL
      window.open(videoUrl, '_blank');
    }
  };
  
  if (loading) {
    return (
      <Layout>
        <Container>
          <p>正在加载视频信息...</p>
        </Container>
      </Layout>
    );
  }
  
  if (error) {
    return (
      <Layout>
        <Container>
          <Alert variant="danger">{error}</Alert>
        </Container>
      </Layout>
    );
  }
  
  if (!movie) {
    return (
      <Layout>
        <Container>
          <Alert variant="warning">未找到电影信息</Alert>
        </Container>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <Container fluid>
        <Row>
          {/* Video player */}
          <Col lg={9} className="mb-4">
            <Card>
              <Card.Body>
                <h1 className="mb-3">{movie.translated_title || movie.title}</h1>
                
                {playerError && (
                  <Alert variant="warning" className="mb-3">
                    {playerError}
                    <div className="mt-2 d-flex gap-2">
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={handleRetry}
                      >
                        重试播放
                      </Button>
                      <a 
                        href={videoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn btn-sm btn-outline-info"
                      >
                        前往原站播放
                      </a>
                    </div>
                  </Alert>
                )}
                
                <div className="ratio ratio-16x9 mb-3">
                  {hlsUrl ? (
                    <ReactPlayer
                      key={`player-${retryCount}`} // Force re-render on retry
                      ref={playerRef}
                      url={hlsUrl}
                      controls={true}
                      width="100%"
                      height="100%"
                      onError={handlePlayerError}
                      config={{
                        file: {
                          forceHLS: true,
                          hlsOptions: {
                            xhrSetup: function(xhr: XMLHttpRequest) {
                              xhr.withCredentials = false;
                            },
                            maxLoadingDelay: 4,
                            maxMaxBufferLength: 60,
                            liveSyncDuration: 3,
                            levelLoadingTimeOut: 10000,
                            manifestLoadingTimeOut: 10000,
                            fragLoadingTimeOut: 20000,
                            enableWorker: true,
                            debug: false
                          }
                        }
                      }}
                      playing={true}
                    />
                  ) : (
                    <div className="d-flex align-items-center justify-content-center bg-dark text-white">
                      无法加载视频播放器
                    </div>
                  )}
                </div>
                
                <div className="d-flex flex-wrap gap-2">
                  <a 
                    href={videoUrl}
                    className="btn btn-primary" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    前往原站观看
                  </a>
                  
                  {magnetLink && (
                    <a 
                      href={magnetLink}
                      className="btn btn-outline-secondary" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      使用磁力链接下载
                    </a>
                  )}
                  
                  <Link 
                    href={`/movie/${movie.id}`}
                    className="btn btn-outline-info"
                  >
                    返回影片详情
                  </Link>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          {/* Movie info sidebar */}
          <Col lg={3}>
            <Card>
              <div className="position-relative" style={{ height: '320px' }}>
                <Image
                  src={`/api/images/${movie.id}/cover.jpg`}
                  alt={movie.title}
                  fill
                  sizes="(max-width: 992px) 100vw, 33vw"
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <Card.Body>
                <h5>{movie.translated_title || movie.title}</h5>
                <p className="text-muted">{movie.id} | {movie.date}</p>
                
                {movie.summary && (
                  <div className="mt-3">
                    <h6>影片简介</h6>
                    <p className="small" style={{ maxHeight: '150px', overflow: 'auto' }}>
                      {movie.translated_summary || movie.summary}
                    </p>
                  </div>
                )}
                
                {movie.actors && movie.actors.length > 0 && (
                  <div className="mt-3">
                    <h6>演员</h6>
                    <div className="d-flex flex-wrap gap-1">
                      {movie.actors.map((actor) => (
                        <Link
                          key={actor.id}
                          href={`/search?keyword=${encodeURIComponent(actor.name)}`}
                          className="badge bg-info text-decoration-none"
                        >
                          {actor.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </Layout>
  );
} 